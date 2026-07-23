package com.example.starter_project_2025.domain.grammar.scheduler;

/**
 * The four SM2 lifecycle states a grammar card moves through.
 *
 * <p>Persisted on {@code GrammarProgress.state} as the enum {@link #name()} (so the
 * stored/wire values stay {@code "NEW" / "LEARNING" / "REVIEW" / "RELEARNING"} —
 * unchanged from when these were raw strings). Using the enum in the scheduler
 * turns what used to be silent string-typo bugs into compile errors.</p>
 */
public enum SrsState {
    NEW,
    LEARNING,
    REVIEW,
    RELEARNING;

    /** Parse a stored state defensively; unknown / null falls back to {@link #NEW}. */
    public static SrsState from(String raw) {
        if (raw == null) return NEW;
        try {
            return valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return NEW;
        }
    }
}
