package com.example.starter_project_2025.domain.library.srs.fsrs;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Outcome of an FSRS reschedule run (dry-run or applied).
 *
 * <p>A reschedule recomputes each card's Difficulty/Stability/due-date by
 * replaying its {@code anki_review_logs} through {@link
 * com.example.starter_project_2025.domain.library.srs.study.scheduler.FsrsScheduler}.
 * The aggregate counts let the UI show a "X cards earlier / Y later" summary
 * before the user commits; {@link #samples} carries a handful of concrete
 * before→after changes for the confirmation dialog.
 */
@Getter
@Builder
public class RescheduleResultDTO {

    /** True when nothing was persisted — caller asked for a preview only. */
    private final boolean dryRun;

    /** Echoes the deck's scheduler (always "FSRS" for a successful run). */
    private final String algorithmType;

    /** Total non-NEW cards considered. */
    private final int totalCards;

    /** Cards whose state/due/memory actually changed. */
    private final int rescheduled;

    /** Cards reconstructed from real review-log history (accurate). */
    private final int fromHistory;

    /** Cards with no logs (studied before logging existed) seeded from their
     *  current interval — an estimate, flagged so the UI can say so. */
    private final int estimated;

    /** Cards left untouched (NEW, or in-progress learning with no history). */
    private final int skipped;

    /** Of the rescheduled cards, how many become due earlier than before. */
    private final int dueEarlier;

    /** Of the rescheduled cards, how many become due later than before. */
    private final int dueLater;

    /** Mean interval (days) across REVIEW cards before / after, for context. */
    private final long avgIntervalBefore;
    private final long avgIntervalAfter;

    /** A capped list of concrete before→after changes for the preview dialog. */
    private final List<Change> samples;

    @Getter
    @Builder
    public static class Change {
        private final Long flashcardId;
        private final String oldState;
        private final String newState;
        private final Integer oldIntervalDays;
        private final Integer newIntervalDays;
        private final String oldDue;   // ISO-8601, nullable
        private final String newDue;   // ISO-8601, nullable
        private final Double stability;
        private final Double difficulty;
        /** "HISTORY" (replayed from logs) or "ESTIMATED" (seeded from interval). */
        private final String source;
    }
}
