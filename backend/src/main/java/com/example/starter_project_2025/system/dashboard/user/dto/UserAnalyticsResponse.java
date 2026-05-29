package com.example.starter_project_2025.system.dashboard.user.dto;

import java.util.List;

/**
 * Response DTO for {@code GET /api/dashboard/users/analytics}.
 *
 * <p>No {@link com.example.starter_project_2025.init.annotation.ResourceMenu}
 * annotation: the analytics view is now folded into the {@code /users}
 * page as the "Analytic" tab, so a separate sidebar entry would be
 * duplicate. The HTTP endpoint stays — the User page's tab calls it via
 * the same {@code useUserAnalytics} hook.
 */
public record UserAnalyticsResponse(
        Summary summary,
        List<RoleDistribution> roleDistribution,
        List<GrowthPoint> growth,
        List<RecentUser> recentUsers,
        List<TopStreakUser> topStreaks
) {
    public record Summary(
            long totalUsers,
            long activeUsers,
            long newUsersThisMonth,
            long newUsersLastMonth,
            double growthPercent
    ) {}

    public record RoleDistribution(
            String role,
            long count
    ) {}

    public record GrowthPoint(
            String date,
            long count
    ) {}

    public record RecentUser(
            Long id,
            String fullName,
            String email,
            String avatarUrl,
            List<String> roles,
            String createdAt
    ) {}

    public record TopStreakUser(
            Long userId,
            String fullName,
            String email,
            String avatarUrl,
            int currentStreak,
            int longestStreak
    ) {}
}
