package com.example.starter_project_2025.system.analyze;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analyze")
@RequiredArgsConstructor
@Tag(name = "Japanese Analysis", description = "Tokenize & break down Japanese text")
@SecurityRequirement(name = "bearerAuth")
public class AnalyzeController {

    private final AnalyzeService analyzeService;

    @PostMapping
    @Operation(summary = "Analyze a Japanese sentence")
    public ResponseEntity<AnalysisResponse> analyze(@Valid @RequestBody AnalysisRequest req) {
        return ResponseEntity.ok(analyzeService.analyze(req.getText()));
    }
}
