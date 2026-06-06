package com.example.starter_project_2025.domain.grammar.review;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * Combined result of a grammar review: the production grading verdict (tier 2,
 * quality) plus the updated SRS scheduling state (tier 1, mechanical signal that
 * actually drove the schedule).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrammarReviewResponse {

    // ── Grading (from production GradingService) ──
    Long attemptId;
    String finalVerdict;        // PASS / PARTIAL / FAIL
    Boolean detectorPassed;     // did they use the target grammar (mechanical)
    Double judgeScore;          // 0..1 LLM holistic score (nullable if AI offline)
    String feedback;
    String correction;
    String referenceAnswer;

    // ── SRS (from GrammarScheduler) ──
    Long subUseId;
    String ratingApplied;       // AGAIN / HARD / GOOD / EASY
    String state;               // NEW / LEARNING / REVIEW / RELEARNING
    Integer intervalDays;
    Integer reviewCount;
    Integer lapses;
    Double memoryScore;
    LocalDateTime nextReviewAt;

    // Preview of what each button would schedule next time (Anki-style labels)
    String againPreview;
    String hardPreview;
    String goodPreview;
    String easyPreview;
}
