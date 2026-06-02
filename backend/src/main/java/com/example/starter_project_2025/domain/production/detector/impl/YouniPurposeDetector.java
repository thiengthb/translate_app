package com.example.starter_project_2025.domain.production.detector.impl;

import com.example.starter_project_2025.system.analyze.SudachiToken;
import com.example.starter_project_2025.domain.production.detector.DetectionResult;
import com.example.starter_project_2025.domain.production.detector.DetectorSupport;
import com.example.starter_project_2025.domain.production.detector.GrammarDetector;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class YouniPurposeDetector implements GrammarDetector {

    @Override
    public String detectorKey() {
        return "n3_youni";
    }

    @Override
    public DetectionResult detect(List<SudachiToken> tokens) {
        String s = DetectorSupport.joinSurfaces(tokens);
        if (DetectorSupport.containsAny(s, "ように", "ような", "ようになり", "ようにし")) {
            return DetectionResult.pass("～ように");
        }
        return DetectionResult.fail();
    }
}
