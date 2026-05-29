package com.example.starter_project_2025.system.streak.dto;

import java.time.LocalDate;
import java.util.List;

public record CalendarResponse(
        int year,
        int month,
        List<LocalDate> activeDates
) {}
