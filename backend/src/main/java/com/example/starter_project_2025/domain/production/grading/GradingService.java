package com.example.starter_project_2025.domain.production.grading;

import com.example.starter_project_2025.domain.production.detector.DetectionResult;
import com.example.starter_project_2025.domain.production.detector.DetectorRegistry;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarkerRepository;
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

    private static final double MEANING_THRESHOLD = 0.6;

    private final PromptCacheRepository promptCacheRepository;
    private final ReferenceSentenceRepository referenceRepository;
    private final GrammarMarkerRepository markerRepository;
    private final DetectorRegistry detectorRegistry;
    private final OllamaClient ollamaClient;
    private final TranslationAttemptRepository attemptRepository;

    @Transactional
    public TranslationAttempt grade(Long userId, Long promptId, String answer) {
        PromptCache prompt = promptCacheRepository.findById(promptId)
                .orElseThrow(() -> new ResourceNotFoundException("Prompt not found"));

        GrammarSubUse subUse = prompt.getSubUse();
        ReferenceSentence reference = prompt.getReferenceSentence();

        // Signal 1: deterministic detector (Kuromoji)
        DetectionResult detection = detectorRegistry.run(subUse.getDetectorKey(), answer);
        GrammarMarker markerUsed = resolveMarker(subUse.getId(), detection.getMarkerPattern());

        // Signal 2: LLM judge (Ollama offline), may be null on network/parse error
        JudgeResult judge = ollamaClient.judge(
                reference.getL2Text(), answer, subUse.getNuanceDescription(), subUse.getCommonMistakes());

        String finalVerdict;
        Double judgeScore = judge == null ? null : judge.getMeaningScore();
        String judgeVerdict = judge == null ? null : judge.getVerdict();
        String feedback;

        if (judge == null) {
            finalVerdict = detection.isPassed() ? "PASS" : "FAIL";
            feedback = detection.isPassed()
                    ? "Đã dùng đúng cấu trúc ngữ pháp mục tiêu."
                    : "Chưa thấy cấu trúc ngữ pháp mục tiêu trong câu của bạn.";
        } else {
            boolean meaningOk = judge.getMeaningScore() >= MEANING_THRESHOLD;
            finalVerdict = decide(detection.isPassed(), meaningOk);
            feedback = judge.getFeedback();
        }

        TranslationAttempt attempt = TranslationAttempt.builder()
                .userId(userId)
                .prompt(prompt)
                .userAnswerL2(answer)
                .detectorPassed(detection.isPassed())
                .markerUsed(markerUsed)
                .llmJudgeScore(judgeScore)
                .llmJudgeVerdict(judgeVerdict)
                .llmJudgeFeedback(feedback)
                .finalVerdict(finalVerdict)
                .build();

        return attemptRepository.save(attempt);
    }

    private String decide(boolean detectorPassed, boolean meaningOk) {
        if (detectorPassed && meaningOk) return "PASS";
        if (detectorPassed) return "PARTIAL";
        if (meaningOk) return "PARTIAL";
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
