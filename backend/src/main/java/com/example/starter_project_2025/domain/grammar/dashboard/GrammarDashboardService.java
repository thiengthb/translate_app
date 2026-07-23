package com.example.starter_project_2025.domain.grammar.dashboard;

import com.example.starter_project_2025.domain.grammar.dashboard.GrammarDashboardDTOs.*;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgress;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgressRepository;
import com.example.starter_project_2025.domain.grammar.scheduler.GrammarScheduler;
import com.example.starter_project_2025.domain.grammar.scheduler.SrsState;
import com.example.starter_project_2025.domain.grammar.support.GrammarSpanLocator;
import com.example.starter_project_2025.domain.production.grammar.Grammar;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentenceRepository;
import com.example.starter_project_2025.domain.production.llm.GeminiClient;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    ReferenceSentenceRepository referenceSentenceRepository;
    GrammarScheduler scheduler;
    GeminiClient gemini;
    GrammarSpanLocator spanLocator;
    ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<LevelSummary> dashboard(Long userId) {
        LocalDateTime now = LocalDateTime.now();

        // Per-level totals come from a cheap COUNT…GROUP BY (no rows materialized).
        Map<String, LevelSummary> byLevel = new LinkedHashMap<>();
        for (GrammarSubUseRepository.LevelCount c : subUseRepository.countByJlptLevel()) {
            byLevel.put(c.getLevel(), LevelSummary.builder()
                    .level(c.getLevel())
                    .total((int) c.getTotal())
                    .build());
        }

        // Studied-state counters come only from the rows this user actually has,
        // with their sub-use fetched so reading the level is not an N+1.
        for (GrammarProgress p : progressRepository.findByUserIdWithSubUse(userId)) {
            String level = p.getSubUse().getJlptLevel();
            if (level == null) continue;
            LevelSummary s = byLevel.get(level);
            if (s == null) continue;
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

        List<GrammarSubUse> ofLevel = subUseRepository.findByLevel_CodeIgnoreCase(level).stream()
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

    // Not readOnly: the first view of a grammar point may generate + cache its
    // rich "About" write-up into the production GrammarSubUse row.
    @Transactional
    public GrammarDetail detail(Long userId, Long subUseId) {
        GrammarSubUse su = subUseRepository.findById(subUseId)
                .orElseThrow(() -> new ResourceNotFoundException("Grammar sub-use not found"));
        GrammarProgress p = progressRepository.findByUserIdAndSubUseId(userId, subUseId).orElse(null);

        // Approved reference sentences double as the Examples section. Each carries the
        // surface span of the grammar inside it so the FE can highlight it Bunpro-style.
        List<String> cores = spanLocator.markerCores(subUseId);
        List<ExampleSentence> sentences = referenceSentenceRepository
                .findApprovedBySubUseId(subUseId).stream()
                .map(r -> ExampleSentence.builder()
                        .id(r.getId())
                        .jp(r.getL2Text())
                        .vi(r.getL1Text())
                        .highlight(blankToNull(spanLocator.locateSpan(r.getL2Text(), cores)))
                        .build())
                .toList();

        ensureAboutDetail(su, sentences);

        List<Mistake> mistakes = su.getCommonMistakes() == null ? List.of()
                : su.getCommonMistakes().stream()
                        .map(m -> Mistake.builder().pattern(m.getPattern()).hint(m.getHint()).build())
                        .toList();

        Grammar g = su.getGrammar();
        List<SiblingUse> siblings = g == null ? List.of()
                : subUseRepository.findByGrammarIdOrderByOrderNoAsc(g.getId()).stream()
                        .map(s -> SiblingUse.builder()
                                .subUseId(s.getId())
                                .orderNo(s.getOrderNo())
                                .name(s.getName())
                                .build())
                        .toList();

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
                .aboutDetail(su.getAboutDetail())
                .structurePattern(su.getStructurePattern())
                .exampleJp(su.getExampleJp())
                .exampleVi(su.getExampleVi())
                .exampleNote(su.getExampleNote())
                .exampleJpHighlight(su.getExampleJp() != null
                        ? blankToNull(spanLocator.locateSpan(su.getExampleJp(), cores)) : null)
                .grammarId(g != null ? g.getId() : null)
                .grammarForm(g != null ? g.getForm() : null)
                .titleGloss(g != null ? g.getTitleGloss() : null)
                .textbookSources(g != null && g.getTextbookSources() != null ? g.getTextbookSources() : List.of())
                .grammarNotes(g != null ? g.getNotes() : null)
                .orderNo(su.getOrderNo())
                .siblings(siblings)
                .sentences(sentences)
                .commonMistakes(mistakes)
                .build();
    }

    /**
     * Generate the rich "About" write-up (usage contexts + comparison with
     * near-equivalent grammar) the first time a point is viewed, and cache it on
     * the sub-use row. No-op when already cached or the LLM is offline — the
     * detail screen then falls back to the short seeded gloss.
     */
    private void ensureAboutDetail(GrammarSubUse su, List<ExampleSentence> sentences) {
        // Regenerate when blank OR when the cache predates the structured-JSON format
        // (early versions stored free text) — this self-upgrades old rows on next view.
        if (isRichAbout(su.getAboutDetail())) return;
        if (!gemini.isAvailable()) return;

        StringBuilder examples = new StringBuilder();
        if (su.getExampleJp() != null) {
            examples.append(su.getExampleJp());
            if (su.getExampleVi() != null) examples.append(" — ").append(su.getExampleVi());
            examples.append("\n");
        }
        sentences.stream().limit(3).forEach(s ->
                examples.append(s.getJp()).append(" — ").append(s.getVi()).append("\n"));

        String generated = gemini.explainGrammar(
                su.getName(),
                su.getJlptLevel(),
                su.getNuanceDescription(),
                su.getStructurePattern(),
                examples.isEmpty() ? "(không có)" : examples.toString());
        if (generated != null) {
            su.setAboutDetail(generated);
            subUseRepository.save(su);
        }
    }

    /**
     * True when the cached About is the CURRENT structured JSON format (context items
     * are objects carrying their own example). Older caches — free text or the early
     * string-array format — fail this check and get regenerated on next view.
     */
    private boolean isRichAbout(String s) {
        if (s == null || s.isBlank()) return false;
        try {
            var context = objectMapper.readTree(s).path("context");
            return context.isArray() && !context.isEmpty() && context.get(0).hasNonNull("point");
        } catch (Exception e) {
            return false;
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private Map<Long, GrammarProgress> progressBySubUse(Long userId) {
        Map<Long, GrammarProgress> map = new LinkedHashMap<>();
        for (GrammarProgress p : progressRepository.findByUserId(userId)) {
            map.put(p.getSubUse().getId(), p);
        }
        return map;
    }

    private boolean isMastered(GrammarProgress p) {
        return SrsState.from(p.getState()) == SrsState.REVIEW
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
