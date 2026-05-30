package com.example.starter_project_2025.domain.production.grading;

import com.example.starter_project_2025.domain.production.detector.DetectionResult;
import com.example.starter_project_2025.domain.production.detector.DetectorRegistry;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarkerRepository;
import com.example.starter_project_2025.domain.production.grammar.GrammarSpotterService;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentence;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentenceRepository;
import com.example.starter_project_2025.domain.production.llm.JudgeResult;
import com.example.starter_project_2025.domain.production.llm.OllamaClient;
import com.example.starter_project_2025.domain.production.prompt.PromptCache;
import com.example.starter_project_2025.domain.production.prompt.PromptCacheRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GradingService {

    /** Minimum meaning score to count as "meaning roughly OK" (→ at least PARTIAL). */
    private static final double MEANING_THRESHOLD = 0.7;
    /** Minimum meaning score required for a full PASS (in addition to correct grammar). */
    private static final double PASS_THRESHOLD = 0.85;

    private final PromptCacheRepository promptCacheRepository;
    private final ReferenceSentenceRepository referenceRepository;
    private final GrammarMarkerRepository markerRepository;
    private final DetectorRegistry detectorRegistry;
    private final GrammarSpotterService grammarSpotter;
    private final OllamaClient ollamaClient;
    private final TranslationAttemptRepository attemptRepository;

    @Transactional
    public TranslationAttempt grade(Long userId, Long promptId, String answer) {
        PromptCache prompt = promptCacheRepository.findById(promptId)
                .orElseThrow(() -> new ResourceNotFoundException("Prompt not found"));

        GrammarSubUse subUse = prompt.getSubUse();
        ReferenceSentence reference = prompt.getReferenceSentence();

        // Signal 1: grammar detection.
        // Prefer a hand-written Kuromoji detector; if the sub-use has none (most
        // data-seeded grammar points), fall back to the regex-backed grammar bank.
        DetectionResult detection = detectorRegistry.run(subUse.getDetectorKey(), answer);
        boolean detectorPassed = detection.isPassed();
        if (!detectorPassed && !detectorRegistry.hasDetector(subUse.getDetectorKey())) {
            detectorPassed = grammarSpotter.matchesSubUse(subUse.getId(), answer);
        }
        GrammarMarker markerUsed = resolveMarker(subUse.getId(), detection.getMarkerPattern());

        // Signal 2: LLM judge (Ollama offline), may be null on network/parse error
        JudgeResult judge = ollamaClient.judge(
                reference.getL2Text(), answer, subUse.getNuanceDescription(), subUse.getCommonMistakes());

        String finalVerdict;
        Double judgeScore = judge == null ? null : judge.getMeaningScore();
        String judgeVerdict = judge == null ? null : judge.getVerdict();
        String feedback;

        if (judge == null) {
            // Meaning can't be verified offline → never award a full PASS.
            finalVerdict = detectorPassed ? "PARTIAL" : "FAIL";
            feedback = detectorPassed
                    ? "Đã dùng đúng cấu trúc ngữ pháp mục tiêu, nhưng chưa kiểm tra được nghĩa (AI tạm offline)."
                    : "Chưa thấy cấu trúc ngữ pháp mục tiêu trong câu của bạn.";
        } else {
            finalVerdict = decide(detectorPassed, judge.getMeaningScore());
            feedback = judge.getFeedback();
        }

        TranslationAttempt attempt = TranslationAttempt.builder()
                .userId(userId)
                .prompt(prompt)
                .userAnswerL2(answer)
                .detectorPassed(detectorPassed)
                .markerUsed(markerUsed)
                .llmJudgeScore(judgeScore)
                .llmJudgeVerdict(judgeVerdict)
                .llmJudgeFeedback(feedback)
                .finalVerdict(finalVerdict)
                .build();

        return attemptRepository.save(attempt);
    }

    /**
     * Strict verdict: a full PASS requires BOTH the target grammar pattern AND a
     * high meaning score ({@link #PASS_THRESHOLD}). Correct grammar with weaker
     * meaning, or good meaning without the target grammar, is only PARTIAL.
     */
    private String decide(boolean detectorPassed, double meaningScore) {
        if (detectorPassed && meaningScore >= PASS_THRESHOLD) return "PASS";
        if (detectorPassed && meaningScore >= MEANING_THRESHOLD) return "PARTIAL";
        if (detectorPassed) return "PARTIAL";                 // right grammar, weak meaning
        if (meaningScore >= MEANING_THRESHOLD) return "PARTIAL"; // right meaning, missing grammar
        return "FAIL";
    }

    private GrammarMarker resolveMarker(Long subUseId, String markerPattern) {
        if (markerPattern == null) return null;
        List<GrammarMarker> markers = markerRepository.findBySubUseId(subUseId);
        return markers.stream()
                .filter(m -> markerPattern.equals(m.getMarkerPattern()))
                .findFirst()
                .orElse(null);
    }
}
