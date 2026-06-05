package com.example.starter_project_2025.domain.grammar.dashboard;

import com.example.starter_project_2025.domain.grammar.dashboard.GrammarDashboardDTOs.*;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgress;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgressRepository;
import com.example.starter_project_2025.domain.grammar.scheduler.GrammarScheduler;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only aggregation powering the learner-facing dashboard + progress screens.
 * Combines the grammar module's own {@link GrammarProgress} with the production
 * module's grammar units (read-only) — no external module is modified.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GrammarDashboardService {

    /** A REVIEW card with interval ≥ this many days counts as "mastered" (Bunpro-ish). */
    private static final int MASTERED_INTERVAL_DAYS = 21;

    GrammarProgressRepository progressRepository;
    GrammarSubUseRepository subUseRepository;
    GrammarScheduler scheduler;

    @Transactional(readOnly = true)
    public List<LevelSummary> dashboard(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        Map<Long, GrammarProgress> bySub = progressBySubUse(userId);

        // Preserve a stable N5→N1 order via an ordered map keyed by level code.
        Map<String, LevelSummary> byLevel = new LinkedHashMap<>();
        for (GrammarSubUse su : subUseRepository.findAll()) {
            String level = su.getJlptLevel();
            if (level == null) continue;
            LevelSummary s = byLevel.computeIfAbsent(level,
                    l -> LevelSummary.builder().level(l).build());
            s.setTotal(s.getTotal() + 1);

            GrammarProgress p = bySub.get(su.getId());
            if (p == null) continue;
            s.setUnlocked(s.getUnlocked() + 1);
            if (isMastered(p)) {
                s.setMastered(s.getMastered() + 1);
            } else {
                s.setLearning(s.getLearning() + 1);
            }
            if (scheduler.isDue(p, now)) {
                s.setReviewDue(s.getReviewDue() + 1);
            }
        }

        List<LevelSummary> result = new ArrayList<>(byLevel.values());
        result.sort(Comparator.comparingInt(s -> levelRank(s.getLevel())));
        return result;
    }

    @Transactional(readOnly = true)
    public LevelDetail level(Long userId, String level) {
        Map<Long, GrammarProgress> bySub = progressBySubUse(userId);

        List<GrammarItem> mastered = new ArrayList<>();
        List<GrammarItem> learning = new ArrayList<>();
        List<GrammarItem> locked = new ArrayList<>();

        List<GrammarSubUse> ofLevel = subUseRepository.findAll().stream()
                .filter(su -> level.equalsIgnoreCase(su.getJlptLevel()))
                .sorted(Comparator.comparing(GrammarSubUse::getName,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        for (GrammarSubUse su : ofLevel) {
            GrammarProgress p = bySub.get(su.getId());
            GrammarItem item = GrammarItem.builder()
                    .subUseId(su.getId())
                    .name(su.getName())
                    .state(p != null ? p.getState() : null)
                    .memoryScore(p != null ? p.getMemoryScore() : null)
                    .nextReviewAt(p != null ? p.getNextReviewAt() : null)
                    .build();
            if (p == null) {
                locked.add(item);
            } else if (isMastered(p)) {
                mastered.add(item);
            } else {
                learning.add(item);
            }
        }

        return LevelDetail.builder()
                .level(level)
                .total(ofLevel.size())
                .unlocked(mastered.size() + learning.size())
                .mastered(mastered)
                .learning(learning)
                .locked(locked)
                .build();
    }

    @Transactional(readOnly = true)
    public GrammarDetail detail(Long userId, Long subUseId) {
        GrammarSubUse su = subUseRepository.findById(subUseId)
                .orElseThrow(() -> new ResourceNotFoundException("Grammar sub-use not found"));
        GrammarProgress p = progressRepository.findByUserIdAndSubUseId(userId, subUseId).orElse(null);

        return GrammarDetail.builder()
                .subUseId(su.getId())
                .name(su.getName())
                .jlptLevel(su.getJlptLevel())
                .state(p != null ? p.getState() : "NEW")
                .intervalDays(p != null ? p.getIntervalDays() : null)
                .reviewCount(p != null ? p.getReviewCount() : null)
                .lapses(p != null ? p.getLapses() : null)
                .memoryScore(p != null ? p.getMemoryScore() : null)
                .lastReviewedAt(p != null ? p.getLastReviewedAt() : null)
                .nextReviewAt(p != null ? p.getNextReviewAt() : null)
                .nuanceDescription(su.getNuanceDescription())
                .structurePattern(su.getStructurePattern())
                .exampleJp(su.getExampleJp())
                .exampleVi(su.getExampleVi())
                .build();
    }

    private Map<Long, GrammarProgress> progressBySubUse(Long userId) {
        Map<Long, GrammarProgress> map = new LinkedHashMap<>();
        for (GrammarProgress p : progressRepository.findByUserId(userId)) {
            map.put(p.getSubUse().getId(), p);
        }
        return map;
    }

    private boolean isMastered(GrammarProgress p) {
        return "REVIEW".equals(p.getState())
                && p.getIntervalDays() != null
                && p.getIntervalDays() >= MASTERED_INTERVAL_DAYS;
    }

    /** N5 first (rank 0) … N1 last; unknown codes sink to the bottom. */
    private int levelRank(String level) {
        if (level == null || level.length() < 2) return 99;
        try {
            int n = Integer.parseInt(level.substring(1));   // "N5" -> 5
            return 5 - n;                                   // N5->0, N1->4
        } catch (NumberFormatException e) {
            return 99;
        }
    }
}
