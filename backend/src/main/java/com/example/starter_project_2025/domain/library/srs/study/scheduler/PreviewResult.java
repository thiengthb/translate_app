package com.example.starter_project_2025.domain.library.srs.study.scheduler;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * Short human-readable labels ("1m", "10m", "1d", "4d", …) shown on the four
 * rating buttons, telling the user when the card would next appear for each
 * choice. Computed without mutating the real progress.
 */
@Getter
@Builder
@AllArgsConstructor
public class PreviewResult {
    private final String again;
    private final String hard;
    private final String good;
    private final String easy;
}
