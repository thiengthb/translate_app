package com.example.starter_project_2025.system.streak.dto;

import java.time.LocalDate;

/**
 * Streak summary returned by {@code GET /api/streak/me}.
 *
 * <p>No {@code @ResourceMenu} here: streak lives inside the dashboard "Record"
 * widget and /dashboard is every role's home (a static FE route reached from
 * the rail's Home button), so a second menu row for the same URL only
 * collided with the Dashboard row and hijacked its title.
 */
public record StreakResponse(
        int currentStreak,
        int longestStreak,
        int totalActiveDays,
        LocalDate lastActivityDate,
        boolean checkedInToday
) {}
