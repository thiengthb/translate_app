package com.example.starter_project_2025.domain.production.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AttemptRequest {

    @NotNull(message = "promptId is required")
    private Long promptId;

    @NotBlank(message = "answer is required")
    @Size(max = 1000, message = "Answer too long (max 1000 chars)")
    private String answer;
}
