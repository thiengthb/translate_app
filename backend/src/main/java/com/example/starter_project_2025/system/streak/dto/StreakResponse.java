package com.example.starter_project_2025.system.streak.dto;

import java.time.LocalDate;

public record StreakResponse(
        int currentStreak,
        int longestStreak,
        int totalActiveDays,
        LocalDate lastActivityDate,
        boolean checkedInToday
) {}
