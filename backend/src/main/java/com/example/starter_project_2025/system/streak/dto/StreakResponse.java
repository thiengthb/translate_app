package com.example.starter_project_2025.system.streak.dto;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

import java.time.LocalDate;

/**
 * Streak summary returned by {@code GET /api/streak/me}.
 *
 * <p>Carries the {@link ResourceMenu} annotation so {@code AutoMenuInitializer}
 * auto-creates a sidebar entry pointing at {@code /streak} — keeps the
 * page reachable even when the user is on mobile (StreakBadge in the
 * header is hidden below {@code md:}).
 */
@ResourceMenu(
        title = "Streak",
        group = "Community",
        icon = "calendar-days",
        url = "/streak",
        description = "Your daily learning check-in streak.",
        order = 2,
        permission = ""
)
public record StreakResponse(
        int currentStreak,
        int longestStreak,
        int totalActiveDays,
        LocalDate lastActivityDate,
        boolean checkedInToday
) {}
