package com.example.starter_project_2025.domain.assessment.attempt;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StartAttemptRequest {

    @NotNull(message = "quizId is required")
    private Long quizId;

    private Long assignmentId;
}
