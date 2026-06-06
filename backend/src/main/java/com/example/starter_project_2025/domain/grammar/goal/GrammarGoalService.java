package com.example.starter_project_2025.domain.grammar.goal;

import com.example.starter_project_2025.domain.grammar.goal.GrammarGoalDTOs.GoalSnapshot;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgress;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgressRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/** Reads / writes the per-user daily grammar goal and computes today's progress against it. */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GrammarGoalService {

    GrammarGoalRepository goalRepository;
    GrammarProgressRepository progressRepository;

    @Transactional
    public GrammarGoal getOrCreate(Long userId) {
        return goalRepository.findByUserId(userId)
                .orElseGet(() -> goalRepository.save(
                        GrammarGoal.builder().userId(userId).newPerDay(5).reviewsPerDay(50).build()));
    }

    @Transactional
    public GoalSnapshot snapshot(Long userId) {
        GrammarGoal goal = getOrCreate(userId);
        return toSnapshot(goal, progressRepository.findByUserId(userId));
    }

    @Transactional
    public GoalSnapshot update(Long userId, Integer newPerDay, Integer reviewsPerDay) {
        GrammarGoal goal = getOrCreate(userId);
        goal.setNewPerDay(newPerDay);
        goal.setReviewsPerDay(reviewsPerDay);
        goal = goalRepository.save(goal);
        return toSnapshot(goal, progressRepository.findByUserId(userId));
    }

    /** Grammar points first studied today (counts toward the "new per day" goal). */
    public long newDoneToday(List<GrammarProgress> progresses, LocalDate today) {
        return progresses.stream()
                .filter(p -> p.getFirstLearnedAt() != null
                        && today.equals(p.getFirstLearnedAt().toLocalDate()))
                .count();
    }

    /** Reviews done today, excluding cards first learned today (those count as "new"). */
    public long reviewsDoneToday(List<GrammarProgress> progresses, LocalDate today) {
        return progresses.stream()
                .filter(p -> p.getLastReviewedAt() != null
                        && today.equals(p.getLastReviewedAt().toLocalDate()))
                .filter(p -> p.getFirstLearnedAt() == null
                        || !today.equals(p.getFirstLearnedAt().toLocalDate()))
                .count();
    }

    private GoalSnapshot toSnapshot(GrammarGoal goal, List<GrammarProgress> progresses) {
        LocalDate today = LocalDate.now();
        int newDone = (int) newDoneToday(progresses, today);
        int reviewsDone = (int) reviewsDoneToday(progresses, today);
        return GoalSnapshot.builder()
                .newPerDay(goal.getNewPerDay())
                .reviewsPerDay(goal.getReviewsPerDay())
                .newDoneToday(newDone)
                .reviewsDoneToday(reviewsDone)
                .newRemaining(Math.max(0, goal.getNewPerDay() - newDone))
                .reviewsRemaining(Math.max(0, goal.getReviewsPerDay() - reviewsDone))
                .build();
    }
}
