package com.example.starter_project_2025.system.profile.dto;

import java.time.Instant;
import java.time.LocalDateTime;

/**
 * One active refresh token = one signed-in device/browser. The {@code current}
 * flag points at the session that issued the current request, so the UI can
 * label it and disable revocation on it (revoking the current session would
 * just log the user out — the dedicated /auth/logout endpoint already does
 * that more cleanly).
 */
public record SessionResponse(
        Long id,
        String userAgent,
        String ipAddress,
        Instant lastUsedAt,
        LocalDateTime createdAt,
        boolean current
) {}
