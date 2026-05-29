package com.example.starter_project_2025.domain.production.detector;

import com.atilika.kuromoji.ipadic.Token;

import java.util.List;

public interface GrammarDetector {

    String detectorKey();

    DetectionResult detect(List<Token> tokens);
}
