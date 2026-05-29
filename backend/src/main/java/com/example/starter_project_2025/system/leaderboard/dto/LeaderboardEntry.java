package com.example.starter_project_2025.system.leaderboard.dto;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

import java.util.List;

@ResourceMenu(
        title = "Leaderboard",
        group = "Community",
        icon = "trophy",
        url = "/leaderboard",
        order = 1,
        permission = ""
)
public record LeaderboardEntry(
        int rank,
        Long userId,
        String fullName,
        String avatarUrl,
        List<String> roles,
        int currentStreak,
        int longestStreak,
        int totalActiveDays
) {}
