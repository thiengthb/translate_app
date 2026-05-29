package com.example.starter_project_2025.domain.production.detector.impl;

import com.atilika.kuromoji.ipadic.Token;
import com.example.starter_project_2025.domain.production.detector.DetectionResult;
import com.example.starter_project_2025.domain.production.detector.GrammarDetector;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ConditionalBaDetector implements GrammarDetector {

    @Override
    public String detectorKey() {
        return "n4_conditional_ba";
    }

    @Override
    public DetectionResult detect(List<Token> tokens) {
        // Hypothetical (仮定形) stem followed by the ば particle is the cleanest signal.
        for (int i = 0; i < tokens.size(); i++) {
            Token t = tokens.get(i);
            boolean hypothetical = "仮定形".equals(t.getConjugationForm());
            boolean baAfter = i + 1 < tokens.size() && tokens.get(i + 1).getSurface().startsWith("ば");
            boolean baMerged = t.getSurface().endsWith("ば") && hypothetical;
            if (hypothetical && (baAfter || baMerged)) {
                return DetectionResult.pass("～ば");
            }
        }
        return DetectionResult.fail();
    }
}
