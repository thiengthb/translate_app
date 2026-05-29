package com.example.starter_project_2025.system.leaderboard;

import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.system.leaderboard.dto.LeaderboardEntry;
import com.example.starter_project_2025.system.leaderboard.dto.PublicProfileResponse;
import com.example.starter_project_2025.system.leaderboard.dto.PublicProfileResponse.StreakSummary;
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

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LeaderboardServiceImpl implements LeaderboardService {

    UserRepository userRepository;
    UserStreakRepository userStreakRepository;

    private static final String ADMIN_ROLE = "ADMIN";

    @Override
    public List<LeaderboardEntry> getLeaderboard(int limit, String sortBy) {
        int pageSize = Math.max(1, Math.min(limit, 100));
        // Fetch more than needed so we can drop admins and still fill the board.
        List<UserStreak> streaks = userStreakRepository
                .findAllByOrderByCurrentStreakDescLongestStreakDesc(
                        PageRequest.of(0, Math.min(pageSize * 3, 300))
                );

        // Apply requested sort
        Comparator<UserStreak> comparator = "longest".equalsIgnoreCase(sortBy)
                ? Comparator
                    .comparingInt((UserStreak s) -> orZero(s.getLongestStreak())).reversed()
                    .thenComparing(s -> orZero(s.getCurrentStreak()), Comparator.reverseOrder())
                : Comparator
                    .comparingInt((UserStreak s) -> orZero(s.getCurrentStreak())).reversed()
                    .thenComparing(s -> orZero(s.getLongestStreak()), Comparator.reverseOrder());

        List<UserStreak> sorted = streaks.stream()
                .filter(s -> s.getUser() != null && !isAdmin(s.getUser()))
                .sorted(comparator)
                .toList();

        List<LeaderboardEntry> board = new ArrayList<>();
        int rank = 0;
        for (UserStreak s : sorted) {
            if (board.size() >= pageSize) break;
            rank++;
            User u = s.getUser();
            board.add(new LeaderboardEntry(
                    rank,
                    u.getId(),
                    buildFullName(u),
                    u.getAvatarUrl(),
                    rolesOf(u),
                    orZero(s.getCurrentStreak()),
                    orZero(s.getLongestStreak()),
                    orZero(s.getTotalActiveDays())
            ));
        }
        return board;
    }

    @Override
    public PublicProfileResponse getPublicProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (isAdmin(user)) {
            // Admin profiles are not publicly viewable.
            throw new BadRequestException("Profile not available");
        }

        UserStreak streak = userStreakRepository.findByUserId(user.getId()).orElse(null);
        StreakSummary streakSummary = streak == null
                ? new StreakSummary(0, 0, 0, null)
                : new StreakSummary(
                        orZero(streak.getCurrentStreak()),
                        orZero(streak.getLongestStreak()),
                        orZero(streak.getTotalActiveDays()),
                        streak.getLastActivityDate()
                );

        return new PublicProfileResponse(
                user.getId(),
                buildFullName(user),
                user.getAvatarUrl(),
                user.getBio(),
                rolesOf(user),
                user.getCreatedAt(),
                streakSummary
        );
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private boolean isAdmin(User user) {
        Set<Role> roles = user.getRoles();
        if (roles == null) return false;
        return roles.stream()
                .map(Role::getName)
                .filter(java.util.Objects::nonNull)
                .anyMatch(name -> ADMIN_ROLE.equalsIgnoreCase(name.trim()));
    }

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

    private int orZero(Integer v) {
        return v == null ? 0 : v;
    }
}
