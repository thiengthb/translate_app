package com.example.starter_project_2025.system.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request body for {@code PATCH /api/profile/theme}.
 *
 * The pattern matches the FE {@code ThemePreference} union so a typo can't
 * sneak in. Validated again against {@link com.example.starter_project_2025.system.profile.ProfileServiceImpl#SUPPORTED_THEMES}
 * before persisting.
 */
public record UpdateThemeRequest(
        @NotBlank(message = "{validation.theme.required}")
        @Pattern(regexp = "^(light|dark|system)$", message = "{validation.theme.pattern}")
        String theme
) {}
