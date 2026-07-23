package com.example.starter_project_2025.domain.grammar.review;

import com.example.starter_project_2025.domain.grammar.progress.GrammarProgress;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgressRepository;
import com.example.starter_project_2025.domain.grammar.scheduler.GrammarScheduler;
import com.example.starter_project_2025.domain.grammar.scheduler.Rating;
import com.example.starter_project_2025.domain.production.grading.GradingService;
import com.example.starter_project_2025.domain.production.grading.TranslationAttempt;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sprint 2 — bridges the existing production grading loop to the grammar SRS
 * schedule, entirely from inside the grammar module.
 *
 * <p>It <b>uses</b> (never modifies) {@link GradingService}: grade the answer,
 * read its deterministic {@code detectorPassed} + holistic {@code finalVerdict},
 * map them to an Anki rating, then advance the per-user {@link GrammarProgress}
 * via {@link GrammarScheduler}. The production module is untouched.</p>
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GrammarReviewService {

    /** LLM score (0..1) at/above which a grammar-correct answer is rated EASY. */
    private static final double EASY_SCORE_THRESHOLD = 0.95;

    GradingService gradingService;
    GrammarProgressRepository progressRepository;
    GrammarScheduler scheduler;
    UserRepository userRepository;

    @Transactional
    public GrammarReviewResponse review(Long userId, Long promptId, String answer) {
        // 1. Grade via the existing production pipeline (detector + LLM judge).
        TranslationAttempt attempt = gradingService.grade(userId, promptId, answer);
        GrammarSubUse subUse = attempt.getPrompt().getSubUse();

        // 2. Map the mechanical/holistic signals to a deterministic SRS rating.
        Rating rating = toRating(
                Boolean.TRUE.equals(attempt.getDetectorPassed()),
                attempt.getFinalVerdict(),
                attempt.getLlmJudgeScore());

        // 3. Load or create this user's SRS state for the grammar usage, advance it.
        GrammarProgress progress = progressRepository
                .findByUserIdAndSubUseId(userId, subUse.getId())
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                    return GrammarProgress.builder()
                            .user(user)
                            .subUse(subUse)
                            .state("NEW")
                            .build();
                });

        scheduler.applyRating(progress, rating);
        progress = progressRepository.save(progress);

        // 4. Combine grading verdict + new SRS state into one response.
        return GrammarReviewResponse.builder()
                .attemptId(attempt.getId())
                .finalVerdict(attempt.getFinalVerdict())
                .detectorPassed(attempt.getDetectorPassed())
                .judgeScore(attempt.getLlmJudgeScore())
                .feedback(attempt.getLlmJudgeFeedback())
                .correction(attempt.getLlmCorrection())
                .referenceAnswer(attempt.getPrompt().getReferenceSentence().getL2Text())
                .subUseId(subUse.getId())
                .ratingApplied(rating.name())
                .state(progress.getState())
                .intervalDays(progress.getIntervalDays())
                .reviewCount(progress.getReviewCount())
                .lapses(progress.getLapses())
                .memoryScore(progress.getMemoryScore())
                .nextReviewAt(progress.getNextReviewAt())
                .againPreview(scheduler.previewLabel(progress, Rating.AGAIN))
                .hardPreview(scheduler.previewLabel(progress, Rating.HARD))
                .goodPreview(scheduler.previewLabel(progress, Rating.GOOD))
                .easyPreview(scheduler.previewLabel(progress, Rating.EASY))
                .build();
    }

    /**
     * Deterministic mapping of grading signals → Anki rating.
     *
     * <p>Because this is <b>grammar</b> practice, the mechanical detector is the
     * tier-1 gate: if the learner did not actually use the target grammar, the
     * card is rated AGAIN regardless of how good the sentence meaning was.
     * When the grammar IS used, the LLM holistic verdict refines the grade.</p>
     */
    private Rating toRating(boolean detectorPassed, String finalVerdict, Double judgeScore) {
        if (!detectorPassed) {
            return Rating.AGAIN;
        }
        if ("PASS".equals(finalVerdict)) {
            return judgeScore != null && judgeScore >= EASY_SCORE_THRESHOLD ? Rating.EASY : Rating.GOOD;
        }
        // PARTIAL or FAIL but grammar form was correct → keep it short, review soon.
        return Rating.HARD;
    }
}
