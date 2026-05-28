package com.example.starter_project_2025.system.auth.authentication.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Step 2 of a 2FA-enabled login.
 *
 * @param tempToken opaque handle returned by step-1 /auth/login
 * @param code      6-digit TOTP code from the authenticator app, OR a recovery
 *                  code (any length / dash format) — the server detects which.
 */
public record TwoFactorLoginRequest(
        @NotBlank(message = "{validation.token.required}")
        String tempToken,

        @NotBlank(message = "{validation.confirmPassword.required}")
        String code
) {}
