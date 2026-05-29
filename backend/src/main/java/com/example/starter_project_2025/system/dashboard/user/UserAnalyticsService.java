package com.example.starter_project_2025.system.dashboard.user;

import com.example.starter_project_2025.system.dashboard.user.dto.UserAnalyticsResponse;
import com.example.starter_project_2025.system.dashboard.user.dto.UserAnalyticsResponse.GrowthPoint;
import com.example.starter_project_2025.system.dashboard.user.dto.UserAnalyticsResponse.RecentUser;
import com.example.starter_project_2025.system.dashboard.user.dto.UserAnalyticsResponse.RoleDistribution;
import com.example.starter_project_2025.system.dashboard.user.dto.UserAnalyticsResponse.Summary;
import com.example.starter_project_2025.system.dashboard.user.dto.UserAnalyticsResponse.TopStreakUser;
import com.example.starter_project_2025.system.rbac.role.Role;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import com.example.starter_project_2025.system.streak.UserStreak;
import com.example.starter_project_2025.system.streak.UserStreakRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserAnalyticsService {

    UserRepository userRepository;
    UserStreakRepository userStreakRepository;

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    public UserAnalyticsResponse getAnalytics(int growthDays) {
        return new UserAnalyticsResponse(
                buildSummary(),
                buildRoleDistribution(),
                buildGrowth(growthDays),
                buildRecentUsers(),
                buildTopStreaks()
        );
    }

    // ─── Summary ────────────────────────────────────────────────────────────

    private Summary buildSummary() {
        long total = userRepository.count();
        long active = userRepository.countByIsActive(true);

        YearMonth current = YearMonth.now();
        YearMonth previous = current.minusMonths(1);
        long thisMonth = userRepository.countByCreatedAtBetween(
                current.atDay(1).atStartOfDay(),
                current.atEndOfMonth().atTime(23, 59, 59)
        );
        long lastMonth = userRepository.countByCreatedAtBetween(
                previous.atDay(1).atStartOfDay(),
                previous.atEndOfMonth().atTime(23, 59, 59)
        );

        double growth = lastMonth == 0
                ? (thisMonth > 0 ? 100.0 : 0.0)
                : ((thisMonth - lastMonth) * 100.0 / lastMonth);

        return new Summary(total, active, thisMonth, lastMonth, round1(growth));
    }

    // ─── Role distribution ──────────────────────────────────────────────────

    private List<RoleDistribution> buildRoleDistribution() {
        List<User> all = userRepository.findAll();
        Map<String, Long> counts = new HashMap<>();

        for (User u : all) {
            if (u.getRoles() == null || u.getRoles().isEmpty()) {
                counts.merge("NO_ROLE", 1L, Long::sum);
                continue;
            }
            for (Role r : u.getRoles()) {
                if (r.getName() != null) counts.merge(r.getName(), 1L, Long::sum);
            }
        }

        return counts.entrySet().stream()
                .map(e -> new RoleDistribution(e.getKey(), e.getValue()))
                .sorted((a, b) -> Long.compare(b.count(), a.count()))
                .toList();
    }

    // ─── Growth time series ─────────────────────────────────────────────────

    private List<GrowthPoint> buildGrowth(int days) {
        LocalDate start = LocalDate.now().minusDays(days - 1L);
        List<Object[]> rows = userRepository.countDailyUsersSince(start.atStartOfDay());

        Map<LocalDate, Long> byDay = new HashMap<>();
        for (Object[] r : rows) {
            LocalDate d;
            if (r[0] instanceof Date sqlDate) {
                d = sqlDate.toLocalDate();
            } else if (r[0] instanceof LocalDate ld) {
                d = ld;
            } else if (r[0] instanceof LocalDateTime ldt) {
                d = ldt.toLocalDate();
            } else {
                continue;
            }
            byDay.put(d, ((Number) r[1]).longValue());
        }

        List<GrowthPoint> series = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            LocalDate d = start.plusDays(i);
            series.add(new GrowthPoint(d.format(DAY_FMT), byDay.getOrDefault(d, 0L)));
        }
        return series;
    }

    // ─── Recent users ───────────────────────────────────────────────────────

    private List<RecentUser> buildRecentUsers() {
        return userRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(u -> new RecentUser(
                        u.getId(),
                        buildFullName(u),
                        u.getEmail(),
                        u.getAvatarUrl(),
                        rolesOf(u),
                        u.getCreatedAt() != null ? u.getCreatedAt().toString() : null
                ))
                .toList();
    }

    // ─── Top streaks ────────────────────────────────────────────────────────

    private List<TopStreakUser> buildTopStreaks() {
        List<UserStreak> streaks = userStreakRepository
                .findAllByOrderByCurrentStreakDescLongestStreakDesc(PageRequest.of(0, 10));

        return streaks.stream()
                .filter(s -> s.getCurrentStreak() != null && s.getCurrentStreak() > 0)
                .map(s -> {
                    User u = s.getUser();
                    return new TopStreakUser(
                            u.getId(),
                            buildFullName(u),
                            u.getEmail(),
                            u.getAvatarUrl(),
                            s.getCurrentStreak(),
                            s.getLongestStreak()
                    );
                })
                .toList();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private String buildFullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        String name = (first + " " + last).trim();
        return name.isEmpty() ? u.getEmail() : name;
    }

    private List<String> rolesOf(User u) {
        if (u.getRoles() == null) return List.of();
        return u.getRoles().stream()
                .map(Role::getName)
                .filter(java.util.Objects::nonNull)
                .sorted()
                .toList();
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
