package com.example.starter_project_2025.system.streak;

import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import com.example.starter_project_2025.system.streak.dto.CalendarResponse;
import com.example.starter_project_2025.system.streak.dto.CheckInResponse;
import com.example.starter_project_2025.system.streak.dto.StreakResponse;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StreakServiceImpl implements StreakService {

    UserRepository userRepository;
    UserStreakRepository userStreakRepository;
    StreakActivityRepository activityRepository;

    @Override
    @Transactional
    public CheckInResponse checkIn(String email) {
        User user = findUser(email);
        LocalDate today = LocalDate.now();

        boolean alreadyToday = activityRepository.existsByUserIdAndActivityDate(user.getId(), today);
        UserStreak streak = loadOrCreateStreak(user);

        if (alreadyToday) {
            return new CheckInResponse(toResponse(streak, true), false);
        }

        activityRepository.save(StreakActivity.builder()
                .user(user)
                .activityDate(today)
                .build());

        LocalDate last = streak.getLastActivityDate();
        int newStreak;
        if (last == null || last.plusDays(1).isBefore(today)) {
            newStreak = 1; // missed a day → reset
        } else if (last.equals(today)) {
            newStreak = streak.getCurrentStreak(); // safety net, shouldn't happen
        } else {
            newStreak = streak.getCurrentStreak() + 1; // consecutive
        }

        streak.setCurrentStreak(newStreak);
        streak.setLongestStreak(Math.max(streak.getLongestStreak(), newStreak));
        streak.setTotalActiveDays(streak.getTotalActiveDays() + 1);
        streak.setLastActivityDate(today);
        userStreakRepository.save(streak);

        return new CheckInResponse(toResponse(streak, true), true);
    }

    @Override
    public StreakResponse getMyStreak(String email) {
        User user = findUser(email);
        UserStreak streak = userStreakRepository.findByUserId(user.getId())
                .orElseGet(() -> emptyStreak(user));

        // If user missed yesterday, currentStreak is stale until next check-in.
        // We surface the *real* current streak: if last activity is older than
        // yesterday, treat current as 0 in the response (don't mutate DB here).
        int displayedCurrent = streak.getCurrentStreak();
        if (streak.getLastActivityDate() != null
                && streak.getLastActivityDate().isBefore(LocalDate.now().minusDays(1))) {
            displayedCurrent = 0;
        }

        boolean checkedInToday = streak.getLastActivityDate() != null
                && streak.getLastActivityDate().equals(LocalDate.now());

        return new StreakResponse(
                displayedCurrent,
                streak.getLongestStreak(),
                streak.getTotalActiveDays(),
                streak.getLastActivityDate(),
                checkedInToday
        );
    }

    @Override
    public CalendarResponse getCalendar(String email, int year, int month) {
        if (month < 1 || month > 12) {
            throw new BadRequestException("Month must be between 1 and 12");
        }
        User user = findUser(email);
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        List<LocalDate> dates = activityRepository
                .findByUserIdAndActivityDateBetweenOrderByActivityDateAsc(user.getId(), start, end)
                .stream()
                .map(StreakActivity::getActivityDate)
                .toList();

        return new CalendarResponse(year, month, dates);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found"));
    }

    private UserStreak loadOrCreateStreak(User user) {
        return userStreakRepository.findByUserId(user.getId())
                .orElseGet(() -> emptyStreak(user));
    }

    private UserStreak emptyStreak(User user) {
        return UserStreak.builder()
                .user(user)
                .currentStreak(0)
                .longestStreak(0)
                .totalActiveDays(0)
                .lastActivityDate(null)
                .build();
    }

    private StreakResponse toResponse(UserStreak streak, boolean checkedInToday) {
        return new StreakResponse(
                streak.getCurrentStreak(),
                streak.getLongestStreak(),
                streak.getTotalActiveDays(),
                streak.getLastActivityDate(),
                checkedInToday
        );
    }
}
