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
        String aboutDetail;        // rich About (contexts + comparisons), AI-cached; null = use gloss
        String structurePattern;
        String exampleJp;
        String exampleVi;
        String exampleNote;
        String exampleJpHighlight;  // grammar span inside exampleJp (null = no highlight)
        // Parent expression (dictionary entry grouping the ①② usages)
        Long grammarId;
        String grammarForm;        // surface form shown as the entry title, e.g. ～うちに
        String titleGloss;
        List<String> textbookSources;
        String grammarNotes;       // "Chú ý" caveats of the whole expression
        Integer orderNo;           // this usage's position within the expression (①=1)
        List<SiblingUse> siblings; // all usages of the expression, in ①② order
        List<ExampleSentence> sentences;
        List<Mistake> commonMistakes;
    }

    /** A sibling usage (①②…) of the same parent expression — powers the usage switcher. */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class SiblingUse {
        Long subUseId;
        Integer orderNo;
        String name;
    }

    /** One reference sentence shown in the Examples section. */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ExampleSentence {
        Long id;
        String jp;
        String vi;
        String highlight;          // grammar span inside jp (null = no highlight)
    }

    /** One common-mistake entry (wrong pattern + how to fix it). */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Mistake {
        String pattern;
        String hint;
    }
}
