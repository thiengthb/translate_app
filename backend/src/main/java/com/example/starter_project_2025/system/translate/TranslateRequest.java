package com.example.starter_project_2025.system.translate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/translate}.
 *
 * @param sourceLang null/blank ⇒ let DeepL auto-detect the source language.
 * @param formality  one of {@code default|more|less|prefer_more|prefer_less};
 *                   only honoured for target languages that support formality.
 */
public record TranslateRequest(
        @NotBlank(message = "Text to translate is required")
        @Size(max = 5000, message = "Text must be at most 5000 characters")
        String text,

        String sourceLang,

        @NotBlank(message = "Target language is required")
        String targetLang,

        String formality
) {
}
