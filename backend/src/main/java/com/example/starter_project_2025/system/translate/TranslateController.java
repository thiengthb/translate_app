package com.example.starter_project_2025.system.translate;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * DeepL-backed translation endpoints. Authenticated like the rest of {@code /api/**};
 * the frontend axios instance attaches the JWT automatically.
 */
@RestController
@RequestMapping("/api/translate")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Translation", description = "Translate text via DeepL")
@SecurityRequirement(name = "bearerAuth")
public class TranslateController {

    DeepLClient deepLClient;
    TranslationAnalysisService analysisService;

    @PostMapping
    @Operation(summary = "Translate text from one language to another")
    public ResponseEntity<TranslateResponse> translate(@Valid @RequestBody TranslateRequest request) {
        return ResponseEntity.ok(deepLClient.translate(
                request.text(),
                request.sourceLang(),
                request.targetLang(),
                request.formality()
        ));
    }

    @PostMapping("/analyze")
    @Operation(summary = "Analyze a translation: romaji, alternatives, and JLPT Grammar Spotter")
    public ResponseEntity<TranslateAnalysisResponse> analyze(@Valid @RequestBody TranslateAnalysisRequest request) {
        return ResponseEntity.ok(analysisService.analyze(request));
    }

    @GetMapping("/languages")
    @Operation(summary = "List languages supported by DeepL (type=source|target)")
    public ResponseEntity<List<LanguageOption>> languages(
            @RequestParam(value = "type", defaultValue = "target") String type
    ) {
        return ResponseEntity.ok(deepLClient.languages(type));
    }
}
