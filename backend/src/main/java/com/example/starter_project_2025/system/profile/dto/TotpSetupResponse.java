package com.example.starter_project_2025.system.profile.dto;

/**
 * Returned by {@code POST /api/profile/2fa/setup}.
 *
 * @param secret    Base32 secret, also embedded in {@code qrDataUri}, shown
 *                  so the user can enter it manually if they can't scan a QR.
 * @param qrDataUri {@code data:image/png;base64,...} URL for an &lt;img&gt;.
 */
public record TotpSetupResponse(
        String secret,
        String qrDataUri
) {}
