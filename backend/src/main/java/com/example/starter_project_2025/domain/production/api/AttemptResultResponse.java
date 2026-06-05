package com.example.starter_project_2025.domain.production.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AttemptResultResponse {

    private Long attemptId;

    private String finalVerdict;

    private boolean detectorPassed;

    private Double judgeScore;

    private String feedback;

    /** AI rewrite of the learner's own sentence into correct, natural Japanese. */
    private String correction;

    private String referenceAnswer;
}
