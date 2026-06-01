package com.example.starter_project_2025.system.auth.authentication.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
public record ResetPasswordRequest (

        @NotBlank(message = "{validation.token.required}")
        String token,

        @NotBlank(message = "{validation.newPassword.required}")
        @Size(min = 8, max = 100, message = "{validation.newPassword.size}")
        String newPassword
) {}
