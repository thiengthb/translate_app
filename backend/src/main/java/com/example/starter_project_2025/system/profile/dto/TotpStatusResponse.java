package com.example.starter_project_2025.system.profile.dto;

/**
 * Returned by {@code GET /api/profile/2fa}. Lets the FE render the right UI
 * (Enable button vs. Disable button + remaining-recovery-codes count) without
 * leaking the secret itself.
 */
public record TotpStatusResponse(
        boolean enabled,
        int remainingRecoveryCodes
) {}
