package com.example.starter_project_2025.system.profile.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateAvatarRequest(
        @NotBlank(message = "Avatar URL is required")
        String avatarUrl
) {}
