package com.example.starter_project_2025.domain.production.grading;

import com.example.starter_project_2025.domain.production.detector.DetectionResult;
import com.example.starter_project_2025.domain.production.detector.DetectorRegistry;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarkerRepository;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentence;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentenceRepository;
import com.example.starter_project_2025.domain.production.llm.GeminiClient;
import com.example.starter_project_2025.domain.production.llm.JudgeResult;
import com.example.starter_project_2025.domain.production.llm.OllamaClient;
import com.example.starter_project_2025.domain.production.prompt.PromptCache;
import com.example.starter_project_2025.domain.production.prompt.PromptCacheRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
    private final GeminiClient geminiClient;
    private final OllamaClient ollamaClient;
    private final JudgeVerdictCacheRepository judgeCacheRepository;
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

        // Signal 2: LLM judge (cached), may be null when Gemini unavailable
        JudgeResult judge = judgeWithCache(reference, answer, subUse);

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

    private JudgeResult judgeWithCache(ReferenceSentence reference, String answer, GrammarSubUse subUse) {
        if (geminiClient.isAvailable()) {
            String hash = sha256(normalize(answer));

            JudgeVerdictCache cached = judgeCacheRepository
                    .findByReferenceSentenceIdAndLearnerAnswerHash(reference.getId(), hash)
                    .orElse(null);
            if (cached != null) {
                return JudgeResult.builder()
                        .meaningScore(cached.getScore() == null ? 0 : cached.getScore())
                        .pointUsed(false)
                        .grammarOk(false)
                        .verdict(cached.getVerdict())
                        .feedback(cached.getFeedback())
                        .build();
            }

            JudgeResult judge = geminiClient.judge(
                    reference.getL2Text(), answer, subUse.getNuanceDescription(), subUse.getCommonMistakes());
            if (judge != null) {
                judgeCacheRepository.save(JudgeVerdictCache.builder()
                        .referenceSentence(reference)
                        .learnerAnswerHash(hash)
                        .verdict(judge.getVerdict())
                        .score(judge.getMeaningScore())
                        .feedback(judge.getFeedback())
                        .build());
                return judge;
            }
            log.warn("Gemini returned null (quota/network error) — falling back to Ollama");
        }

        return ollamaClient.judge(
                reference.getL2Text(), answer, subUse.getNuanceDescription(), subUse.getCommonMistakes());
    }

    private GrammarMarker resolveMarker(Long subUseId, String markerPattern) {
        if (markerPattern == null) return null;
        List<GrammarMarker> markers = markerRepository.findBySubUseId(subUseId);
        return markers.stream()
                .filter(m -> markerPattern.equals(m.getMarkerPattern()))
                .findFirst()
                .orElse(null);
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim().replaceAll("\\s+", "");
    }

    private String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(s.hashCode());
        }
    }
}
