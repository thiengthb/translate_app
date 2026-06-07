package com.example.starter_project_2025.domain.library.srs.study.scheduler;

import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;

import java.time.LocalDateTime;

/**
 * Common contract for every spaced-repetition scheduler.
 *
 * <p>Implementations:
 * <ul>
 *   <li>{@code Sm2Scheduler} — the current Anki-like SM-2 (fully implemented).</li>
 *   <li>{@code FsrsScheduler} — FSRS (future enhancement; skeleton only).</li>
 * </ul>
 *
 * <p>{@code review} mutates the given {@link AnkiSrsProgress} (state, interval,
 * next review date, etc.) and returns a {@link ScheduleResult}; the caller saves
 * the progress. {@code preview} computes the next-interval labels for all four
 * buttons WITHOUT touching the real progress.
 */
public interface SrsScheduler {

    /** The algorithm this scheduler implements — used by the factory to route. */
    SchedulerType type();

    /** Apply a rating and update the progress in place. */
    ScheduleResult review(AnkiSrsProgress progress, Rating rating, SchedulingConfig config, LocalDateTime now);

    /** Compute the four rating-button preview labels (no mutation). */
    PreviewResult preview(AnkiSrsProgress progress, SchedulingConfig config, LocalDateTime now);
}
