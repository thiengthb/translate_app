package com.example.starter_project_2025.system.auth.authentication.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record ForgotPasswordRequest(

        @NotBlank(message = "{validation.email.required}")
        @Email(message = "{validation.email.invalid}", regexp = ".+@.+\\..+")
        String email
) {
}
