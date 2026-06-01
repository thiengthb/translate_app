package com.example.starter_project_2025.system.streak;

import com.example.starter_project_2025.system.streak.dto.CalendarResponse;
import com.example.starter_project_2025.system.streak.dto.CheckInResponse;
import com.example.starter_project_2025.system.streak.dto.StreakResponse;

public interface StreakService {

    CheckInResponse checkIn(String email);

    StreakResponse getMyStreak(String email);

    CalendarResponse getCalendar(String email, int year, int month);
}
