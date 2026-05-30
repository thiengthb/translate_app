package com.example.starter_project_2025.domain.assessment.attempt;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SubmitAnswerRequest {

    @NotNull(message = "attemptQuestionId is required")
    private Long attemptQuestionId;

    private Long selectedOptionId;

    private List<Long> selectedOptionIds;

    private String answerText;

    private Integer responseTimeMs;
}
