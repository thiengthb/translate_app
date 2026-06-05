package com.example.starter_project_2025.system.translate;

/**
 * A language supported by DeepL, as returned by {@code /v2/languages}.
 *
 * @param code              DeepL language code, e.g. "EN-US", "JA", "DE".
 * @param name              Human-readable name, e.g. "English (American)".
 * @param supportsFormality whether the formality parameter is honoured for this
 *                          (target) language. Always false for source languages.
 */
public record LanguageOption(
        String code,
        String name,
        Boolean supportsFormality
) {
}
