package com.example.starter_project_2025.domain.production.detector;

import com.example.starter_project_2025.system.analyze.SudachiToken;
import com.example.starter_project_2025.system.analyze.SudachiTokenizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class DetectorRegistry {

    private final SudachiTokenizer tokenizer;
    private final Map<String, GrammarDetector> detectors;

    public DetectorRegistry(SudachiTokenizer tokenizer, List<GrammarDetector> detectorBeans) {
        this.tokenizer = tokenizer;
        this.detectors = detectorBeans.stream()
                .collect(Collectors.toMap(GrammarDetector::detectorKey, Function.identity()));
    }

    public boolean hasDetector(String detectorKey) {
        return detectors.containsKey(detectorKey);
    }

    public DetectionResult run(String detectorKey, String answer) {
        GrammarDetector detector = detectors.get(detectorKey);
        if (detector == null) {
            return DetectionResult.fail();
        }
        List<SudachiToken> tokens = tokenizer.tokenize(answer == null ? "" : answer);
        return detector.detect(tokens);
    }
}
