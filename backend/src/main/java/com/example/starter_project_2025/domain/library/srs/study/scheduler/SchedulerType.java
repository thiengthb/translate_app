package com.example.starter_project_2025.domain.library.srs.study.scheduler;

/**
 * Which scheduling algorithm a deck/preset uses.
 * SM2  = current, fully implemented (Anki-like SM-2).
 * FSRS = future enhancement (skeleton only for now).
 */
public enum SchedulerType {
    SM2, FSRS;

    /** Lenient parse; null / unknown / "CUSTOM" falls back to SM2 so the
     *  system never breaks if a preset is mis-configured. */
    public static SchedulerType fromString(String raw) {
        if (raw == null) return SM2;
        try {
            return valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return SM2;
        }
    }
}
