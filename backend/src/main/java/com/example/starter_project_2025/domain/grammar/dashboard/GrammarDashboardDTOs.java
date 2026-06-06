package com.example.starter_project_2025.domain.grammar.dashboard;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

/** Response payloads for the learner-facing grammar dashboard / progress screens. */
public final class GrammarDashboardDTOs {

    private GrammarDashboardDTOs() {}

    /** One JLPT level row on the dashboard. */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class LevelSummary {
        String level;
        int total;
        int unlocked;
        int learning;
        int reviewDue;
        int mastered;
    }

    /** A grammar usage as shown in a progress list (lightweight). */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class GrammarItem {
        Long subUseId;
        String name;
        String state;              // null when locked / not started
        Double memoryScore;
        LocalDateTime nextReviewAt;
    }

    /** The "Grammar Progress" screen for a single level. */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class LevelDetail {
        String level;
        int total;
        int unlocked;
        List<GrammarItem> mastered;
        List<GrammarItem> learning;
        List<GrammarItem> locked;
    }

    /** Full detail of one grammar usage for the "Grammar Detail" screen. */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class GrammarDetail {
        Long subUseId;
        String name;
        String jlptLevel;
        String state;              // NEW (if never studied) / LEARNING / REVIEW / RELEARNING
        Integer intervalDays;
        Integer reviewCount;
        Integer lapses;
        Double memoryScore;
        LocalDateTime lastReviewedAt;
        LocalDateTime nextReviewAt;
        // Dictionary content (read from the production GrammarSubUse)
        String nuanceDescription;
        String structurePattern;
        String exampleJp;
        String exampleVi;
    }
}
