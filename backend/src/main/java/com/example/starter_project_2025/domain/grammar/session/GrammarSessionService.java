package com.example.starter_project_2025.domain.grammar.session;

import com.example.starter_project_2025.domain.grammar.goal.GrammarGoal;
import com.example.starter_project_2025.domain.grammar.goal.GrammarGoalService;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgress;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgressRepository;
import com.example.starter_project_2025.domain.grammar.scheduler.GrammarScheduler;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.domain.production.grammar.ScenarioStubRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Sprint 3 — builds a Bunpro-style "Continue Learning" session: due spaced-repetition
 * reviews first, then a few brand-new grammar units, all from inside the grammar module.
 *
 * <p>Reads (never writes) the production module's grammar units + scenarios to decide
 * what is learnable; reads the grammar module's own {@link GrammarProgress} to decide
 * what is due. Eligible "new" units are those with a pool-ready scenario (same rule the
 * production exercise picker uses), so every queued item can actually drive an exercise.</p>
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GrammarSessionService {

    GrammarProgressRepository progressRepository;
    GrammarSubUseRepository subUseRepository;
    ScenarioStubRepository scenarioRepository;
    GrammarScheduler scheduler;
    GrammarGoalService goalService;

    @Transactional
    public GrammarSessionResponse build(Long userId, String level, boolean extra) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();

        List<GrammarProgress> progresses = progressRepository.findByUserId(userId);
        Set<Long> startedSubUseIds = new HashSet<>();
        for (GrammarProgress p : progresses) {
            startedSubUseIds.add(p.getSubUse().getId());
        }

        // ── Caps: by default today's remaining daily-goal quota (Anki/Bunpro style).
        //    `extra` = study-beyond-goal: take every due review + a fresh batch of
        //    new grammar, because we always encourage extra effort. ──
        GrammarGoal goal = goalService.getOrCreate(userId);
        int reviewLimit;
        int newLimit;
        if (extra) {
            reviewLimit = Integer.MAX_VALUE;
            newLimit = Math.max(goal.getNewPerDay(), 5);
        } else {
            reviewLimit = Math.max(0,
                    goal.getReviewsPerDay() - (int) goalService.reviewsDoneToday(progresses, today));
            newLimit = Math.max(0,
                    goal.getNewPerDay() - (int) goalService.newDoneToday(progresses, today));
        }

        // ── Due reviews (sorted earliest-due first), optionally scoped to a level ──
        List<GrammarProgress> due = progresses.stream()
                .filter(p -> scheduler.isDue(p, now))
                .filter(p -> matchesLevel(p.getSubUse(), level))
                .sorted(Comparator.comparing(
                        GrammarProgress::getNextReviewAt,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();

        List<GrammarSessionItem> items = new ArrayList<>();
        for (GrammarProgress p : due.stream().limit(reviewLimit).toList()) {
            GrammarSubUse su = p.getSubUse();
            items.add(GrammarSessionItem.builder()
                    .subUseId(su.getId())
                    .name(su.getName())
                    .jlptLevel(su.getJlptLevel())
                    .kind("REVIEW")
                    .state(p.getState())
                    .intervalDays(p.getIntervalDays())
                    .reviewCount(p.getReviewCount())
                    .nextReviewAt(p.getNextReviewAt())
                    .build());
        }

        // ── New units: eligible (has a pool-ready scenario) and not yet started ──
        Set<Long> eligibleNewIds = new HashSet<>(scenarioRepository.findDistinctApprovedSubUseIds());
        eligibleNewIds.removeAll(startedSubUseIds);

        List<GrammarSubUse> newCandidates = subUseRepository.findAllById(eligibleNewIds).stream()
                .filter(su -> matchesLevel(su, level))
                .sorted(Comparator
                        .comparing(GrammarSubUse::getJlptLevel, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(GrammarSubUse::getName, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        for (GrammarSubUse su : newCandidates.stream().limit(newLimit).toList()) {
            items.add(GrammarSessionItem.builder()
                    .subUseId(su.getId())
                    .name(su.getName())
                    .jlptLevel(su.getJlptLevel())
                    .kind("NEW")
                    .build());
        }

        int reviewCount = (int) items.stream().filter(i -> "REVIEW".equals(i.getKind())).count();
        int newCount = (int) items.stream().filter(i -> "NEW".equals(i.getKind())).count();

        return GrammarSessionResponse.builder()
                .items(items)
                .reviewCount(reviewCount)
                .newCount(newCount)
                .totalDue(due.size())
                .totalNewAvailable(newCandidates.size())
                .build();
    }

    /** True when no level filter is given, or the unit belongs to that JLPT level. */
    private boolean matchesLevel(GrammarSubUse su, String level) {
        return level == null || level.isBlank() || level.equalsIgnoreCase(su.getJlptLevel());
    }
}
