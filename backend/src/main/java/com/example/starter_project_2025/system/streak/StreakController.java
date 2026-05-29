package com.example.starter_project_2025.system.streak;

import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.streak.dto.CalendarResponse;
import com.example.starter_project_2025.system.streak.dto.CheckInResponse;
import com.example.starter_project_2025.system.streak.dto.StreakResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/streak")
@PreAuthorize("isAuthenticated()")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Streak", description = "Daily activity streak tracking for the current user")
public class StreakController {

    StreakService streakService;

    @PostMapping("/check-in")
    @Operation(summary = "Record today's activity and update streak")
    public ResponseEntity<CheckInResponse> checkIn(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(streakService.checkIn(principal.getUsername()));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user's streak info")
    public ResponseEntity<StreakResponse> getMyStreak(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(streakService.getMyStreak(principal.getUsername()));
    }

    @GetMapping("/me/calendar")
    @Operation(summary = "Get activity dates for a specific month (defaults to current month)")
    public ResponseEntity<CalendarResponse> getCalendar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        LocalDate today = LocalDate.now();
        int y = year != null ? year : today.getYear();
        int m = month != null ? month : today.getMonthValue();
        return ResponseEntity.ok(streakService.getCalendar(principal.getUsername(), y, m));
    }
}
