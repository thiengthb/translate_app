package com.example.starter_project_2025.system.streak.dto;

public record CheckInResponse(
        StreakResponse streak,
        boolean newCheckIn
) {}
