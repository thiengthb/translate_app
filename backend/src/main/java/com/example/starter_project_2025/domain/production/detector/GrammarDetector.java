package com.example.starter_project_2025.domain.production.detector;

import com.example.starter_project_2025.system.analyze.SudachiToken;

import java.util.List;

public interface GrammarDetector {

    String detectorKey();

    DetectionResult detect(List<SudachiToken> tokens);
}
