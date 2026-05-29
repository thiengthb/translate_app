package com.example.starter_project_2025.system.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Body for {@code POST /api/profile/2fa/enable}. {@code code} is the first
 * TOTP code the user reads from their authenticator app after scanning the QR
 * — proves they have the secret before we flip the {@code totpEnabled} flag.
 */
public record EnableTotpRequest(
        @NotBlank(message = "{validation.token.required}")
        @Pattern(regexp = "^\\d{6}$", message = "{validation.token.blank}")
        String code
) {}
