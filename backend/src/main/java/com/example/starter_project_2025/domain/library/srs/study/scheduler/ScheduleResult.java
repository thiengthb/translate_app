package com.example.starter_project_2025.domain.library.srs.study.scheduler;

import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Result of applying a rating. Schedulers mutate the {@link AnkiSrsProgress}
 * in place and return it here for convenience, together with the algorithm
 * that produced the new state. The caller is responsible for persisting it.
 */
@Getter
@AllArgsConstructor
public class ScheduleResult {
    private final AnkiSrsProgress progress;
    private final SchedulerType algorithm;
}
