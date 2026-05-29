package com.example.starter_project_2025.system.dashboard.user;

import com.example.starter_project_2025.system.dashboard.user.dto.UserAnalyticsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard/users")
@PreAuthorize("hasAuthority('USER_READ')")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "User Analytics", description = "Admin analytics about users — counts, distribution, growth, streaks")
public class UserAnalyticsController {

    UserAnalyticsService userAnalyticsService;

    @GetMapping("/analytics")
    @Operation(summary = "Get user analytics for the admin dashboard")
    public ResponseEntity<UserAnalyticsResponse> getAnalytics(
            @RequestParam(defaultValue = "30") int growthDays
    ) {
        int days = Math.max(7, Math.min(growthDays, 365));
        return ResponseEntity.ok(userAnalyticsService.getAnalytics(days));
    }
}
