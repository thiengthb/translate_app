package com.example.starter_project_2025.system.dashboard;

import com.example.starter_project_2025.init.annotation.ResourceMenu;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
// /dashboard is every role's home: a static FE route, never permission-gated.
@ResourceMenu(
        title = "Dashboard",
        group = "Dashboard",
        icon = "dashboard",
        url = "/dashboard",
        description = "Trang chủ học tập — streak, nhiệm vụ và thống kê.",
    order = 1,
    permission = ""
)
public class DashboardStatsDTO {
    Long totalUsers;
    Long totalRoles;
    Long totalMenus;
    Long totalMenuItems;
    Long activeUsers;
    Long activeRoles;
    Long activeMenus;
}
