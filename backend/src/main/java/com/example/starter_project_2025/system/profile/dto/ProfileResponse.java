package com.example.starter_project_2025.system.profile.dto;

import java.time.LocalDateTime;
import java.util.Set;

public record ProfileResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String bio,
        String avatarUrl,
        Set<String> roles,
        LocalDateTime createdAt
) {}
