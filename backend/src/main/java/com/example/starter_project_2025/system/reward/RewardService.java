package com.example.starter_project_2025.system.reward;

import com.example.starter_project_2025.domain.assessment.attempt.QuizAttempt;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RewardService {

    UserRepository userRepository;
    UserRewardLogRepository rewardLogRepository;

    /**
     * Called after a quiz attempt is SUBMITTED.
     * Only rewards classroom quiz attempts (assignmentId != null).
     * Idempotent — safe to call multiple times for the same attempt.
     */
    public Optional<UserRewardLog> grantForAttempt(QuizAttempt attempt) {

        // Only classroom quizzes grant rewards
        if (attempt.getAssignmentId() == null) return Optional.empty();
        if (!"SUBMITTED".equals(attempt.getStatus())) return Optional.empty();

        String sourceType = "QUIZ_ATTEMPT";
        Long sourceId = attempt.getId();

        // Idempotency guard
        if (rewardLogRepository.existsByUserIdAndSourceTypeAndSourceId(
                attempt.getUserId(), sourceType, sourceId)) {
            return Optional.empty();
        }

        // Formula
        long expGrant = Math.round(attempt.getEarnedScore()) * 10L
                + (attempt.isPassed() ? 50L : 0L);
        long coinsGrant = (long) (attempt.getPercentage() / 10)
                + (attempt.isPassed() ? 5L : 0L);

        // Update user balances
        User user = userRepository.findById(attempt.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setExp(user.getExp() + expGrant);
        user.setCoins(user.getCoins() + coinsGrant);
        userRepository.save(user);

        // Write audit log
        UserRewardLog log = UserRewardLog.builder()
                .userId(attempt.getUserId())
                .sourceType(sourceType)
                .sourceId(sourceId)
                .expGranted(expGrant)
                .coinsGranted(coinsGrant)
                .description(String.format("Quiz attempt — %.1f%% (%s)",
                        attempt.getPercentage(),
                        attempt.isPassed() ? "PASSED" : "FAILED"))
                .build();

        return Optional.of(rewardLogRepository.save(log));
    }

    /** Current balance + grant history for a user. */
    @Transactional(readOnly = true)
    public Map<String, Object> getBalance(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<UserRewardLog> history = rewardLogRepository
                .findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId);

        long exp = user.getExp();
        int level = levelForExp(exp);
        long expToNext = level >= MAX_LEVEL ? 0L : expForLevel(level + 1) - exp;

        // LinkedHashMap (not Map.of) because activeTitleId may be null and
        // Map.of rejects null values.
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("exp", exp);
        result.put("coins", user.getCoins());
        result.put("level", level);
        result.put("expToNext", expToNext);
        result.put("activeTitleId", null); // no title system yet
        result.put("history", history);
        return result;
    }

    /* ──────────────────────────────────────────
       Level curve — cumulative XP to reach a level is the triangular number
       100 * (n-1) * n / 2 (n = level). A fresh user (0 XP) is level 1; each
       level costs progressively more (100, 200, 300, … XP per level).
       The frontend mirrors this same formula for its progress bar.
    ────────────────────────────────────────── */
    private static final int MAX_LEVEL = 100;

    private static long expForLevel(int level) {
        return level <= 1 ? 0L : 100L * (level - 1) * level / 2L;
    }

    private static int levelForExp(long exp) {
        int level = 1;
        while (level < MAX_LEVEL && expForLevel(level + 1) <= exp) {
            level++;
        }
        return level;
    }
}
