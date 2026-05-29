package com.example.starter_project_2025.system.analyze;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnalysisRequest {

    @NotBlank(message = "Text is required")
    @Size(max = 1000, message = "Text too long (max 1000 chars)")
    private String text;
}
