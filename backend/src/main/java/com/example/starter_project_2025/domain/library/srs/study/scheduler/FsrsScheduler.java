package com.example.starter_project_2025.domain.library.srs.study.scheduler;

import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * FSRS (Free Spaced Repetition Scheduler) — <b>FUTURE ENHANCEMENT, SKELETON ONLY</b>.
 *
 * <p>This class establishes the integration point for FSRS but intentionally
 * does <b>not</b> fake any scheduling. The DSR formulas
 * (Difficulty / Stability / Retrievability) and the parameter optimizer are not
 * implemented yet, so:
 * <ul>
 *   <li>{@link #review} throws {@link UnsupportedOperationException} — the caller
 *       reports HTTP 501 instead of producing fabricated due dates.</li>
 *   <li>{@link #preview} returns placeholder labels ("—").</li>
 * </ul>
 *
 * <p><b>Important:</b> a deck must stay on SM-2 (the default) until FSRS is
 * implemented. The SM-2 scheduler is untouched and fully functional.
 *
 * <p>Roadmap:
 * <ol>
 *   <li>Implement FSRS-6 next-state formulas using
 *       {@link SchedulingConfig#fsrsParameters} (default weights when null) and
 *       {@link SchedulingConfig#desiredRetention}.</li>
 *   <li>Persist difficulty / stability / retrievability / scheduledDays /
 *       elapsedDays on {@link AnkiSrsProgress}.</li>
 *   <li>Add the parameter optimizer that learns from {@code anki_review_logs}
 *       (needs enough history) — future.</li>
 *   <li>Simulator and health-check — future.</li>
 * </ol>
 */
@Component
public class FsrsScheduler implements SrsScheduler {

    @Override
    public SchedulerType type() {
        return SchedulerType.FSRS;
    }

    @Override
    public ScheduleResult review(AnkiSrsProgress progress, Rating rating, SchedulingConfig config, LocalDateTime now) {
        throw new UnsupportedOperationException(
                "FSRS scheduler is not implemented yet (future enhancement). " +
                "Keep the deck on SM-2 until the FSRS formulas are added.");
    }

    @Override
    public PreviewResult preview(AnkiSrsProgress progress, SchedulingConfig config, LocalDateTime now) {
        return PreviewResult.builder().again("—").hard("—").good("—").easy("—").build();
    }
}
