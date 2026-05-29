package com.example.starter_project_2025.system.profile.dto;

import java.util.List;

/**
 * Returned by {@code POST /api/profile/2fa/enable}.
 *
 * @param recoveryCodes plaintext one-time codes — shown to the user once and
 *                       never again. They're hashed on disk.
 */
public record EnableTotpResponse(
        List<String> recoveryCodes
) {}
