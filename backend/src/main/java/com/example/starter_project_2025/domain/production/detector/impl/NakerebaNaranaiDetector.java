package com.example.starter_project_2025.domain.production.detector.impl;

import com.atilika.kuromoji.ipadic.Token;
import com.example.starter_project_2025.domain.production.detector.DetectionResult;
import com.example.starter_project_2025.domain.production.detector.DetectorSupport;
import com.example.starter_project_2025.domain.production.detector.GrammarDetector;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class NakerebaNaranaiDetector implements GrammarDetector {

    @Override
    public String detectorKey() {
        return "n4_obligation";
    }

    @Override
    public DetectionResult detect(List<Token> tokens) {
        String s = DetectorSupport.joinSurfaces(tokens);
        String tail = "ならない|いけない|なりません|いけません|だめ|ダメ";

        if (DetectorSupport.containsAny(s, "なければ", "なけれ")
                && containsTail(s, tail)) {
            return DetectionResult.pass("～なければならない");
        }
        if (s.contains("なきゃ")) {
            return DetectionResult.pass("～なきゃ");
        }
        if (s.contains("ないと") && containsTail(s, tail)) {
            return DetectionResult.pass("～ないといけない");
        }
        if (s.contains("ねば") && s.contains("なら")) {
            return DetectionResult.pass("～ねばならない");
        }
        return DetectionResult.fail();
    }

    private boolean containsTail(String s, String pipeSeparated) {
        for (String part : pipeSeparated.split("\\|")) {
            if (s.contains(part)) return true;
        }
        return false;
    }
}
