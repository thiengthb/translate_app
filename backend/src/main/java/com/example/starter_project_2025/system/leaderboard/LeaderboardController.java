package com.example.starter_project_2025.system.leaderboard;

import com.example.starter_project_2025.system.leaderboard.dto.LeaderboardEntry;
import com.example.starter_project_2025.system.leaderboard.dto.PublicProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Leaderboard", description = "Streak-based ranking and public profiles for non-admin users")
public class LeaderboardController {

    LeaderboardService leaderboardService;

    @GetMapping("/api/leaderboard")
    @Operation(summary = "Get the streak leaderboard (excludes admins)")
    public ResponseEntity<List<LeaderboardEntry>> getLeaderboard(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "current") String sortBy
    ) {
        return ResponseEntity.ok(leaderboardService.getLeaderboard(limit, sortBy));
    }

    @GetMapping("/api/users/{userId}/public-profile")
    @Operation(summary = "Get a user's public profile (admin profiles are not exposed)")
    public ResponseEntity<PublicProfileResponse> getPublicProfile(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(leaderboardService.getPublicProfile(userId));
    }
}
