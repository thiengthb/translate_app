package com.example.starter_project_2025.domain.production.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ExerciseResponse {

    private Long promptId;

    private Long subUseId;

    private String subUseName;

    private String jlptLevel;

    private String l1Prompt;
}
