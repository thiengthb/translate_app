package com.example.starter_project_2025.domain.library.srs.fsrs;

import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.srs.review_log.AnkiReviewLog;
import com.example.starter_project_2025.domain.library.srs.review_log.AnkiReviewLogRepository;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgressRepository;
import com.example.starter_project_2025.domain.library.srs.srs_setting.AnkiSrsSetting;
import com.example.starter_project_2025.domain.library.srs.srs_setting.AnkiSrsSettingRepository;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.FsrsScheduler;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.Rating;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.SchedulingConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Recomputes a deck's FSRS schedule by replaying each card's review history.
 *
 * <p><b>Why this exists.</b> When a deck switches from SM-2 to FSRS, its cards
 * carry SM-2 state ({@code easeFactor} + {@code intervalDays}) but no FSRS
 * memory state ({@code stability}/{@code difficulty}). The plain study path
 * would treat such a card as brand-new on its next review, collapsing a long
 * interval down to a few days. Rescheduling fixes that by reconstructing the
 * FSRS memory state the card <i>would</i> have had if FSRS had scheduled it all
 * along.
 *
 * <p><b>How.</b> For each card we take its {@code anki_review_logs} in
 * chronological order and feed the recorded ratings back through {@link
 * FsrsScheduler} — the same verified FSRS-5 implementation used for live study,
 * using the real timestamps so elapsed-day gaps are exact. The reconstructed
 * stability then drives the new interval, anchored to the card's real last
 * review so the due date keeps its place in the schedule.
 *
 * <p><b>Cards with no logs</b> (studied before review-logging existed) cannot be
 * replayed; we seed stability from the current interval (at the default 0.9
 * retention, interval ≈ stability by construction) and a neutral difficulty.
 * These are reported separately as {@code estimated} so the UI can flag them.
 *
 * <p>Mirrors Anki's "Reschedule cards on change": only memory state + due dates
 * move; ratings, lapse counts and timestamps stay as the true history.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FsrsRescheduleService {

    /** How many concrete before→after changes to return for the preview dialog. */
    private static final int MAX_SAMPLES = 25;

    /** Neutral difficulty seed for cards we cannot replay (no rating history to
     *  derive it from). Midpoint of the FSRS [1,10] difficulty range. */
    private static final double ESTIMATED_DIFFICULTY = 5.0;

    private final DeckRepository deckRepository;
    private final AnkiSrsProgressRepository progressRepository;
    private final AnkiReviewLogRepository reviewLogRepository;
    private final AnkiSrsSettingRepository settingRepository;
    private final FsrsScheduler fsrsScheduler;
    private final ObjectMapper objectMapper;

    /**
     * Reschedule every card in {@code deckId} for {@code userId}.
     *
     * @param dryRun when true, compute the summary WITHOUT persisting anything.
     * @throws IllegalStateException if the deck is not configured for FSRS.
     */
    @Transactional
    public RescheduleResultDTO reschedule(Long userId, Long deckId, boolean dryRun) {
        Deck deck = deckRepository.findById(deckId).orElseThrow();
        AnkiSrsSetting setting = settingRepository.findByUserIdAndDeckId(userId, deckId).orElse(null);
        SchedulingConfig config = SchedulingConfig.from(setting, objectMapper);

        if (!"FSRS".equalsIgnoreCase(config.algorithmType)) {
            throw new IllegalStateException(
                    "Reschedule is only available for decks using FSRS (deck " + deckId
                            + " is on " + config.algorithmType + ").");
        }

        List<AnkiSrsProgress> all = progressRepository.findByUserIdAndDeckId(userId, deckId);
        Map<Long, List<AnkiReviewLog>> logsByProgress = groupLogsByProgress(userId, deckId);

        int rescheduled = 0, fromHistory = 0, estimated = 0, skipped = 0, considered = 0;
        int dueEarlier = 0, dueLater = 0;
        long sumIntervalBefore = 0, sumIntervalAfter = 0;
        int reviewCount = 0;
        List<RescheduleResultDTO.Change> samples = new ArrayList<>();

        for (AnkiSrsProgress p : all) {
            // NEW cards have nothing to reconstruct; leave them entirely alone.
            if ("NEW".equals(p.getState()) || p.getState() == null) {
                skipped++;
                continue;
            }

            List<AnkiReviewLog> cardLogs = logsByProgress.get(p.getId());
            Computed c = (cardLogs != null && !cardLogs.isEmpty())
                    ? fromLogs(p, cardLogs, config)
                    : fromInterval(p, config);

            if (c == null) {
                // In-progress learning card with no history → not safe to seed.
                skipped++;
                continue;
            }

            considered++;
            if ("HISTORY".equals(c.source)) fromHistory++; else estimated++;

            // Averages over REVIEW cards (interval is meaningful there).
            if ("REVIEW".equals(p.getState()) && p.getIntervalDays() != null) {
                sumIntervalBefore += p.getIntervalDays();
                sumIntervalAfter += (c.intervalDays != null ? c.intervalDays : 0);
                reviewCount++;
            }

            boolean changed = !Objects.equals(p.getStability(), c.stability)
                    || !Objects.equals(p.getNextReviewAt(), c.due)
                    || !Objects.equals(p.getState(), c.state)
                    || !Objects.equals(p.getIntervalDays(), c.intervalDays);

            if (changed) {
                rescheduled++;
                if (p.getNextReviewAt() != null && c.due != null) {
                    if (c.due.isBefore(p.getNextReviewAt())) dueEarlier++;
                    else if (c.due.isAfter(p.getNextReviewAt())) dueLater++;
                }
                if (samples.size() < MAX_SAMPLES) {
                    samples.add(RescheduleResultDTO.Change.builder()
                            .flashcardId(p.getFlashcard() != null ? p.getFlashcard().getId() : null)
                            .oldState(p.getState())
                            .newState(c.state)
                            .oldIntervalDays(p.getIntervalDays())
                            .newIntervalDays(c.intervalDays)
                            .oldDue(p.getNextReviewAt() != null ? p.getNextReviewAt().toString() : null)
                            .newDue(c.due != null ? c.due.toString() : null)
                            .stability(c.stability)
                            .difficulty(c.difficulty)
                            .source(c.source)
                            .build());
                }
            }

            if (!dryRun) {
                applyTo(p, c);
            }
        }

        // For dry-run we deliberately mutated NOTHING above, so the transaction
        // commits with no changes. For a real run JPA dirty-checking flushes the
        // mutated managed entities on commit.

        log.info("FSRS reschedule deck={} user={} dryRun={} considered={} rescheduled={} fromHistory={} estimated={} skipped={}",
                deckId, userId, dryRun, considered, rescheduled, fromHistory, estimated, skipped);

        return RescheduleResultDTO.builder()
                .dryRun(dryRun)
                .algorithmType("FSRS")
                .totalCards(all.size())
                .rescheduled(rescheduled)
                .fromHistory(fromHistory)
                .estimated(estimated)
                .skipped(skipped)
                .dueEarlier(dueEarlier)
                .dueLater(dueLater)
                .avgIntervalBefore(reviewCount > 0 ? Math.round((double) sumIntervalBefore / reviewCount) : 0)
                .avgIntervalAfter(reviewCount > 0 ? Math.round((double) sumIntervalAfter / reviewCount) : 0)
                .samples(samples)
                .build();
    }

    /* ── Reconstruction strategies ── */

    /** Replay the recorded ratings through FSRS to rebuild D/S, then derive the
     *  new due date anchored to the card's real last review. */
    private Computed fromLogs(AnkiSrsProgress p, List<AnkiReviewLog> cardLogs, SchedulingConfig config) {
        AnkiSrsProgress sim = freshSim();
        for (AnkiReviewLog logEntry : cardLogs) {
            if (logEntry.getReviewedAt() == null) continue;
            fsrsScheduler.review(sim, Rating.fromString(logEntry.getRating()), config, logEntry.getReviewedAt());
        }

        Computed c = new Computed();
        c.source = "HISTORY";
        c.stability = sim.getStability();
        c.difficulty = sim.getDifficulty();
        c.retrievability = sim.getRetrievability();
        c.state = sim.getState();
        c.intervalDays = sim.getIntervalDays();

        if ("REVIEW".equals(sim.getState()) && sim.getIntervalDays() != null && sim.getIntervalDays() >= 1) {
            // Anchor to the REAL last review so the due date keeps its place even
            // if some early reviews predate logging (sim's own anchor would be the
            // last logged review, which may be older).
            LocalDateTime anchor = p.getLastReviewedAt() != null ? p.getLastReviewedAt() : sim.getLastReviewedAt();
            c.due = anchor != null ? anchor.plusDays(sim.getIntervalDays()) : sim.getNextReviewAt();
        } else {
            // Still in a (re)learning step — keep the scheduler's sub-day timing.
            c.due = sim.getNextReviewAt();
        }
        return c;
    }

    /**
     * Seed FSRS memory state for a card with no replayable history. Only REVIEW
     * cards with a real interval are seeded; in-progress learning cards return
     * null (caller skips them). At the default 0.9 desired retention the FSRS
     * interval equals the stability, so the current interval is the natural
     * stability seed; difficulty has no rating history to derive it from and
     * gets a neutral midpoint.
     */
    private Computed fromInterval(AnkiSrsProgress p, SchedulingConfig config) {
        if (!"REVIEW".equals(p.getState()) || p.getIntervalDays() == null || p.getIntervalDays() < 1) {
            return null;
        }
        int interval = Math.min(p.getIntervalDays(), config.maxIntervalDays);

        Computed c = new Computed();
        c.source = "ESTIMATED";
        c.stability = (double) interval;
        c.difficulty = ESTIMATED_DIFFICULTY;
        c.retrievability = null;
        c.state = "REVIEW";
        c.intervalDays = interval;
        LocalDateTime anchor = p.getLastReviewedAt() != null ? p.getLastReviewedAt() : LocalDateTime.now();
        c.due = anchor.plusDays(interval); // preserves the existing schedule
        return c;
    }

    /* ── Helpers ── */

    private void applyTo(AnkiSrsProgress p, Computed c) {
        p.setStability(c.stability);
        p.setDifficulty(c.difficulty);
        p.setRetrievability(c.retrievability);
        p.setState(c.state);
        p.setIntervalDays(c.intervalDays);
        p.setScheduledDays(c.intervalDays);
        p.setNextReviewAt(c.due);
        p.setAlgorithmType("FSRS");
        // reviewCount, lapses, lastReviewedAt, firstLearnedAt stay as true history.
    }

    private AnkiSrsProgress freshSim() {
        AnkiSrsProgress sim = new AnkiSrsProgress();
        sim.setState("NEW");
        sim.setLearningStepIndex(0);
        sim.setReviewCount(0);
        sim.setLapses(0);
        return sim;
    }

    /** Group a deck's logs by progress id. {@code progress.getId()} on the LAZY
     *  proxy returns the FK without initialising the entity, so this is one query. */
    private Map<Long, List<AnkiReviewLog>> groupLogsByProgress(Long userId, Long deckId) {
        List<AnkiReviewLog> logs = reviewLogRepository.findByUserIdAndDeckIdOrderByReviewedAtAsc(userId, deckId);
        Map<Long, List<AnkiReviewLog>> byProgress = new HashMap<>();
        for (AnkiReviewLog logEntry : logs) {
            if (logEntry.getProgress() == null || logEntry.getReviewedAt() == null) continue;
            byProgress.computeIfAbsent(logEntry.getProgress().getId(), k -> new ArrayList<>()).add(logEntry);
        }
        return byProgress;
    }

    /** Mutable scratch for one card's recomputed state. */
    private static final class Computed {
        String source;
        Double stability;
        Double difficulty;
        Double retrievability;
        String state;
        Integer intervalDays;
        LocalDateTime due;
    }
}
