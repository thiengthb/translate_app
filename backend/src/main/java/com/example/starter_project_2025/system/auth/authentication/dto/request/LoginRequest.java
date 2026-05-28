package com.example.starter_project_2025.system.auth.authentication.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record LoginRequest(

        @NotBlank(message = "{validation.email.required}")
        String email,

        @NotBlank(message = "{validation.password.required}")
        String password
) {
}
