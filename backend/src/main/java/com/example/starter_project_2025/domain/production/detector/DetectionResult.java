package com.example.starter_project_2025.domain.production.detector;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DetectionResult {

    private final boolean passed;

    private final String markerPattern;

    public static DetectionResult pass(String markerPattern) {
        return new DetectionResult(true, markerPattern);
    }

    public static DetectionResult fail() {
        return new DetectionResult(false, null);
    }
}
