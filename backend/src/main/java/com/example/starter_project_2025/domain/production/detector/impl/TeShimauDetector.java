package com.example.starter_project_2025.domain.production.detector.impl;

import com.example.starter_project_2025.system.analyze.SudachiToken;
import com.example.starter_project_2025.domain.production.detector.DetectionResult;
import com.example.starter_project_2025.domain.production.detector.DetectorSupport;
import com.example.starter_project_2025.domain.production.detector.GrammarDetector;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TeShimauDetector implements GrammarDetector {

    @Override
    public String detectorKey() {
        return "n4_te_shimau";
    }

    @Override
    public DetectionResult detect(List<SudachiToken> tokens) {
        String s = DetectorSupport.joinSurfaces(tokens);

        if (DetectorSupport.containsAny(s, "てしま", "でしま")) {
            return DetectionResult.pass("～てしまう");
        }
        if (DetectorSupport.containsAny(s, "ちゃっ", "ちゃう", "じゃっ", "じゃう", "ちゃい", "じゃい")) {
            return DetectionResult.pass("～ちゃう");
        }
        return DetectionResult.fail();
    }
}
