package com.example.starter_project_2025.system.leaderboard.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PublicProfileResponse(
        Long id,
        String fullName,
        String avatarUrl,
        String bio,
        List<String> roles,
        LocalDateTime createdAt,
        StreakSummary streak
) {
    public record StreakSummary(
            int currentStreak,
            int longestStreak,
            int totalActiveDays,
            LocalDate lastActivityDate
    ) {}
}
