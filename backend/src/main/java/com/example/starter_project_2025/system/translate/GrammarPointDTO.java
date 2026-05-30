package com.example.starter_project_2025.system.translate;

/**
 * A JLPT grammar pattern detected in the translated sentence (Grammar Spotter).
 *
 * @param source "dictionary" (deterministic Kuromoji/regex match) or "ai" (LLM supplement).
 */
public record GrammarPointDTO(
        String pattern,
        String level,
        String meaning,
        String matchedText,
        String source
) {
}
