package com.example.starter_project_2025.domain.library.srs.study.scheduler;

/**
 * The four answer buttons shared by every scheduler (Anki-style):
 * AGAIN (forgot) · HARD · GOOD · EASY.
 */
public enum Rating {
    AGAIN, HARD, GOOD, EASY;

    /** Lenient parse from the request string; anything unknown falls back to GOOD. */
    public static Rating fromString(String raw) {
        if (raw == null) return GOOD;
        return switch (raw.trim().toUpperCase()) {
            case "AGAIN" -> AGAIN;
            case "HARD"  -> HARD;
            case "EASY"  -> EASY;
            default      -> GOOD;
        };
    }
}
