package com.example.starter_project_2025.domain.grammar.cloze;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/** Payloads for the Bunpro-style cloze (fill-in-the-blank) flow. */
public final class ClozeDTOs {

    private ClozeDTOs() {}

    /** A cloze question: the reference sentence with the grammar span masked out. */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ClozeQuestion {
        Long referenceSentenceId;
        Long subUseId;
        String subUseName;
        String jlptLevel;
        String l1Text;        // VN meaning hint
        String masked;        // JP sentence with the grammar span replaced by ＿＿＿
        int blankLength;      // number of chars hidden (length hint)
        /** False when no grammar span could be located → caller should fall back to free-write. */
        boolean hasCloze;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ClozeReviewRequest {
        @NotNull(message = "referenceSentenceId is required")
        Long referenceSentenceId;
        @NotBlank(message = "answer is required")
        String answer;
        /** 1-based attempt number within this question (drives the near-miss grace). */
        Integer attemptNo;
    }

    /** Result of grading a cloze answer. */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ClozeResult {
        /** CORRECT / WARN (near-miss, forgiven, retry) / WRONG. */
        String status;
        String message;
        boolean canRetry;

        // Revealed only when the question is finished (CORRECT or WRONG), not on WARN.
        String correctAnswer;
        String fullSentence;

        // SRS — present only when a rating was actually applied (i.e. not WARN).
        String ratingApplied;     // GOOD / AGAIN
        String state;
        Integer intervalDays;
        LocalDateTime nextReviewAt;
        String goodPreview;
        String againPreview;
    }
}
