package com.example.starter_project_2025.system.profile.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Body for {@code POST /api/profile/2fa/disable}. Re-prompts for the user's
 * current password — never let a stolen access token alone disable 2FA.
 */
public record DisableTotpRequest(
        @NotBlank(message = "{validation.currentPassword.required}")
        String currentPassword
) {}
