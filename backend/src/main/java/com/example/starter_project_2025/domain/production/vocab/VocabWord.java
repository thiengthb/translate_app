package com.example.starter_project_2025.domain.production.vocab;

/**
 * A single vocabulary item fed into prompt generation.
 *
 * @param surface the written form (kanji/kana) shown to the learner
 * @param reading optional kana reading
 * @param gloss   short L1 meaning (may be {@code null})
 */
public record VocabWord(String surface, String reading, String gloss) {

    /** Compact "surface (gloss)" form used in the LLM prompt and the [WORDS] line. */
    public String forPrompt() {
        if (gloss == null || gloss.isBlank()) {
            return surface;
        }
        return surface + " (" + gloss + ")";
    }
}
