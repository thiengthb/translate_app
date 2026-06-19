package com.example.starter_project_2025.domain.grammar.scheduler;

/**
 * The four Anki answer buttons. These are produced mechanically (cloze check,
 * grammar detector + holistic verdict), never by free-form text, so the set is
 * closed and exhaustive {@code switch}es over it are checked by the compiler.
 *
 * <p>Persisted on {@code GrammarProgress.lastRating} as {@link #name()}.</p>
 */
public enum Rating {
    AGAIN,
    HARD,
    GOOD,
    EASY;

    /** Parse a rating defensively; unknown / null falls back to {@link #GOOD}. */
    public static Rating from(String raw) {
        if (raw == null) return GOOD;
        try {
            return valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return GOOD;
        }
    }
}
