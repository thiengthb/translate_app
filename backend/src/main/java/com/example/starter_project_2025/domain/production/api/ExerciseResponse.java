package com.example.starter_project_2025.domain.production.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class ExerciseResponse {

    private Long promptId;

    private Long subUseId;

    private String subUseName;

    private String jlptLevel;

    private String l1Prompt;

    /** Vocabulary words seeded into this prompt (so the UI can show them). */
    private List<String> words;

    /** True when this prompt was freshly AI-composed; false for a seeded fallback. */
    private boolean generated;

    /** Coverage drill only: whether the requested target word appears in the answer. */
    private Boolean targetUsed;
}
