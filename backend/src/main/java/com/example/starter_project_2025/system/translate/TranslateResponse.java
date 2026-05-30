package com.example.starter_project_2025.system.translate;

/**
 * Result of a translation.
 *
 * @param detectedSourceLang the language DeepL detected (useful when the caller
 *                           asked for auto-detect); may be null.
 */
public record TranslateResponse(
        String translatedText,
        String detectedSourceLang,
        String targetLang
) {
}
