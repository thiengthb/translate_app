package com.example.starter_project_2025.system.dashboard.user.dto;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

import java.util.List;

@ResourceMenu(
        title = "User Analytics",
        group = "Dashboard",
        icon = "users",
        url = "/admin/users-dashboard",
        order = 2,
        permission = "USER_READ"
)
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
