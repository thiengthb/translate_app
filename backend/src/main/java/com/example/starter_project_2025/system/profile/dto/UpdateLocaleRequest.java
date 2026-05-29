package com.example.starter_project_2025.system.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request body for {@code PATCH /api/profile/locale}.
 *
 * Locale codes are restricted to a short alpha pattern so the column never
 * grows beyond its intended size. The actual set of supported locales is
 * validated against {@link com.example.starter_project_2025.system.profile.ProfileServiceImpl#SUPPORTED_LOCALES}.
 */
public record UpdateLocaleRequest(
        @NotBlank(message = "{validation.locale.required}")
        @Pattern(regexp = "^[a-z]{2}(-[A-Z]{2})?$", message = "{validation.locale.pattern}")
        String locale
) {}
