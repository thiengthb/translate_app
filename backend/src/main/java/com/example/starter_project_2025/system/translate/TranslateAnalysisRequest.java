package com.example.starter_project_2025.system.translate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/translate/analyze}.
 *
 * @param text           the original source text (used as context for alternatives)
 * @param translatedText the DeepL result to analyse (romaji + grammar)
 * @param sourceLang     source language code (may be null)
 * @param targetLang     target language code; romaji + grammar only run when this is Japanese
 */
public record TranslateAnalysisRequest(
        @Size(max = 5000, message = "Text must be at most 5000 characters")
        String text,

        @NotBlank(message = "Translated text is required")
        @Size(max = 5000, message = "Translated text must be at most 5000 characters")
        String translatedText,

        String sourceLang,

        @NotBlank(message = "Target language is required")
        String targetLang
) {
}
