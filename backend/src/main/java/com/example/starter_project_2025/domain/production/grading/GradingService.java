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
import com.example.starter_project_2025.domain.production.llm.GeminiClient;
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

    /** Score (0-1, i.e. 6.5/10) at/above which the answer is "Gần đúng" (PARTIAL). */
    private static final double MEANING_THRESHOLD = 0.65;
    /** Score (0-1, i.e. 8.5/10) at/above which the answer is a full PASS ("Đúng"). */
    private static final double PASS_THRESHOLD = 0.85;

    private final PromptCacheRepository promptCacheRepository;
    private final ReferenceSentenceRepository referenceRepository;
    private final GrammarMarkerRepository markerRepository;
    private final DetectorRegistry detectorRegistry;
    private final GrammarSpotterService grammarSpotter;
    private final GeminiClient geminiClient;
    private final TranslationAttemptRepository attemptRepository;

    @Transactional
    public TranslationAttempt grade(Long userId, Long promptId, String answer) {
        PromptCache prompt = promptCacheRepository.findById(promptId)
                .orElseThrow(() -> new ResourceNotFoundException("Prompt not found"));

        GrammarSubUse subUse = prompt.getSubUse();
        ReferenceSentence reference = prompt.getReferenceSentence();

        // Signal 1: grammar detection.
        // Prefer a hand-written MeCab detector; if the sub-use has none (most
        // data-seeded grammar points), fall back to the regex-backed grammar bank.
        DetectionResult detection = detectorRegistry.run(subUse.getDetectorKey(), answer);
        boolean detectorPassed = detection.isPassed();
        if (!detectorPassed && !detectorRegistry.hasDetector(subUse.getDetectorKey())) {
            detectorPassed = grammarSpotter.matchesSubUse(subUse.getId(), answer);
        }
        GrammarMarker markerUsed = resolveMarker(subUse.getId(), detection.getMarkerPattern());

        // Signal 2: LLM judge (Gemini) — the PRIMARY grader. Its 0-10 score already
        // factors in meaning + correct use of the target grammar + naturalness. May be
        // null on network/parse error or no API key. The detector above is now only a
        // supplementary badge, it no longer gates the score.
        JudgeResult judge = geminiClient.judge(
                subUse.getName(), reference.getL2Text(), answer,
                subUse.getNuanceDescription(), subUse.getCommonMistakes());

        String finalVerdict;
        Double judgeScore = judge == null ? null : judge.getMeaningScore();
        String judgeVerdict = judge == null ? null : judge.getVerdict();
        String feedback;
        String correction = judge == null ? null : judge.getCorrection();

        if (judge == null) {
            // AI offline → fall back to the deterministic detector only.
            finalVerdict = detectorPassed ? "PARTIAL" : "FAIL";
            feedback = detectorPassed
                    ? "Đã dùng đúng cấu trúc ngữ pháp mục tiêu, nhưng chưa kiểm tra được nghĩa (AI tạm offline)."
                    : "Chưa thấy cấu trúc ngữ pháp mục tiêu trong câu của bạn.";
        } else {
            finalVerdict = decide(judge.getMeaningScore());
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
                .llmCorrection(correction)
                .finalVerdict(finalVerdict)
                .build();

        return attemptRepository.save(attempt);
    }

    /**
     * Verdict is driven purely by the AI judge's holistic 0-10 score (normalized to 0-1):
     * {@link #PASS_THRESHOLD}+ = PASS ("Đúng"), {@link #MEANING_THRESHOLD}+ = PARTIAL
     * ("Gần đúng"), otherwise FAIL ("Chưa đạt"). The grammar detector is informational only.
     */
    private String decide(double score) {
        if (score >= PASS_THRESHOLD) return "PASS";
        if (score >= MEANING_THRESHOLD) return "PARTIAL";
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
