package com.example.starter_project_2025.domain.library.srs.fsrs;

import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfig;
import com.example.starter_project_2025.domain.library.srs.review_log.AnkiReviewLog;
import com.example.starter_project_2025.domain.library.srs.review_log.AnkiReviewLogRepository;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgressRepository;
import com.example.starter_project_2025.domain.library.srs.srs_setting.AnkiSrsSetting;
import com.example.starter_project_2025.domain.library.srs.srs_setting.AnkiSrsSettingRepository;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.FsrsScheduler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Verifies the FSRS reschedule engine on top of the (separately pinned)
 * {@link FsrsScheduler}:
 * <ul>
 *   <li>cards WITH review logs are rebuilt by replaying ratings → exact D/S, and
 *       the due date is anchored to the card's real last review;</li>
 *   <li>cards WITHOUT logs are seeded from their interval (estimated);</li>
 *   <li>NEW cards are skipped;</li>
 *   <li>a dry-run mutates NOTHING.</li>
 * </ul>
 *
 * <p>Reference numbers for the two-Good graduation come from
 * {@code FsrsSchedulerTest.learningProgression_twoGoodsGraduate} (py-fsrs v4.1.2).
 */
@ExtendWith(MockitoExtension.class)
class FsrsRescheduleServiceTest {

    private static final double EPS = 1e-6;
    private static final Long USER_ID = 7L;
    private static final Long DECK_ID = 1L;
    private static final LocalDateTime BASE = LocalDateTime.of(2026, 1, 1, 12, 0, 0);

    @Mock private DeckRepository deckRepository;
    @Mock private AnkiSrsProgressRepository progressRepository;
    @Mock private AnkiReviewLogRepository reviewLogRepository;
    @Mock private AnkiSrsSettingRepository settingRepository;

    private FsrsRescheduleService service;

    private AnkiSrsProgress cardWithHistory;   // REVIEW, has 2 GOOD logs
    private AnkiSrsProgress cardNoHistory;      // REVIEW, no logs → estimated
    private AnkiSrsProgress newCard;            // NEW → skipped

    @BeforeEach
    void setUp() {
        FsrsScheduler scheduler = new FsrsScheduler();
        ObjectMapper objectMapper = new ObjectMapper();
        service = new FsrsRescheduleService(
                deckRepository, progressRepository, reviewLogRepository, settingRepository,
                scheduler, objectMapper);

        Deck deck = new Deck();
        deck.setId(DECK_ID);

        SrsAlgorithmConfig fsrsConfig = new SrsAlgorithmConfig();
        fsrsConfig.setCode("FSRS_DEFAULT");
        fsrsConfig.setName("FSRS-5");
        fsrsConfig.setAlgorithmType("FSRS");
        fsrsConfig.setConfigJson("{\"algorithmType\":\"FSRS\",\"desiredRetention\":0.9}");

        AnkiSrsSetting setting = new AnkiSrsSetting();
        setting.setTargetRetention(0.9);
        setting.setAlgorithmConfig(fsrsConfig);

        // ── Card A: REVIEW with two GOOD reviews logged (graduates in FSRS) ──
        cardWithHistory = reviewProgress(10L, 100L, /*interval*/ 99, /*due*/ BASE.plusDays(50));
        cardWithHistory.setLastReviewedAt(BASE.plusMinutes(10)); // real last review
        cardWithHistory.setStability(null);
        cardWithHistory.setDifficulty(null);

        AnkiReviewLog log1 = log(cardWithHistory, "GOOD", BASE);
        AnkiReviewLog log2 = log(cardWithHistory, "GOOD", BASE.plusMinutes(10));

        // ── Card B: REVIEW, no logs, interval 30 → estimated seed ──
        cardNoHistory = reviewProgress(11L, 101L, /*interval*/ 30, /*due*/ BASE);
        cardNoHistory.setLastReviewedAt(BASE);

        // ── Card C: NEW → skipped ──
        newCard = new AnkiSrsProgress();
        newCard.setId(12L);
        newCard.setState("NEW");
        newCard.setFlashcard(flashcard(102L));

        when(deckRepository.findById(DECK_ID)).thenReturn(Optional.of(deck));
        when(settingRepository.findByUserIdAndDeckId(USER_ID, DECK_ID)).thenReturn(Optional.of(setting));
        when(progressRepository.findByUserIdAndDeckId(USER_ID, DECK_ID))
                .thenReturn(List.of(cardWithHistory, cardNoHistory, newCard));
        lenient().when(reviewLogRepository.findByUserIdAndDeckIdOrderByReviewedAtAsc(USER_ID, DECK_ID))
                .thenReturn(List.of(log1, log2));
    }

    @Test
    void dryRun_computesSummaryButMutatesNothing() {
        RescheduleResultDTO result = service.reschedule(USER_ID, DECK_ID, true);

        assertEquals("FSRS", result.getAlgorithmType());
        assertEquals(3, result.getTotalCards());
        assertEquals(1, result.getFromHistory());
        assertEquals(1, result.getEstimated());
        assertEquals(1, result.getSkipped());       // the NEW card
        assertEquals(2, result.getRescheduled());    // both REVIEW cards change
        assertEquals(1, result.getDueEarlier());     // card A: 50d → ~4d
        assertEquals(1, result.getDueLater());       // card B: now → +30d

        // Nothing persisted/mutated on a dry run.
        assertNull(cardWithHistory.getStability());
        assertEquals(99, cardWithHistory.getIntervalDays());
        assertEquals(BASE.plusDays(50), cardWithHistory.getNextReviewAt());
        assertNull(cardNoHistory.getStability());
        assertEquals(30, cardNoHistory.getIntervalDays());
    }

    @Test
    void apply_rebuildsHistoryCardFromLogs() {
        service.reschedule(USER_ID, DECK_ID, false);

        // Two Goods graduate the card; pinned py-fsrs values.
        assertEquals("REVIEW", cardWithHistory.getState());
        assertEquals(4.4668580644, cardWithHistory.getStability(), EPS);
        assertEquals(5.2729679313, cardWithHistory.getDifficulty(), EPS);
        assertEquals(4, cardWithHistory.getIntervalDays());
        assertEquals(4, cardWithHistory.getScheduledDays());
        assertEquals("FSRS", cardWithHistory.getAlgorithmType());
        // Due is anchored to the REAL last review (BASE+10m), not "now".
        assertEquals(BASE.plusMinutes(10).plusDays(4), cardWithHistory.getNextReviewAt());
    }

    @Test
    void apply_seedsNoHistoryCardFromInterval() {
        service.reschedule(USER_ID, DECK_ID, false);

        // No logs → stability seeded from interval, neutral difficulty, schedule kept.
        assertEquals("REVIEW", cardNoHistory.getState());
        assertEquals(30.0, cardNoHistory.getStability(), EPS);
        assertEquals(5.0, cardNoHistory.getDifficulty(), EPS);
        assertEquals(30, cardNoHistory.getIntervalDays());
        assertEquals(BASE.plusDays(30), cardNoHistory.getNextReviewAt());
        assertEquals("FSRS", cardNoHistory.getAlgorithmType());
    }

    @Test
    void apply_leavesNewCardUntouched() {
        service.reschedule(USER_ID, DECK_ID, false);

        assertEquals("NEW", newCard.getState());
        assertNull(newCard.getStability());
        assertNull(newCard.getNextReviewAt());
    }

    /* ── fixtures ── */

    private AnkiSrsProgress reviewProgress(Long id, Long flashcardId, int intervalDays, LocalDateTime due) {
        AnkiSrsProgress p = new AnkiSrsProgress();
        p.setId(id);
        p.setFlashcard(flashcard(flashcardId));
        p.setState("REVIEW");
        p.setIntervalDays(intervalDays);
        p.setReviewCount(2);
        p.setLapses(0);
        p.setLearningStepIndex(0);
        p.setEaseFactor(2.5);
        p.setNextReviewAt(due);
        return p;
    }

    private Flashcard flashcard(Long id) {
        Flashcard f = new Flashcard();
        f.setId(id);
        return f;
    }

    private AnkiReviewLog log(AnkiSrsProgress progress, String rating, LocalDateTime reviewedAt) {
        AnkiReviewLog l = new AnkiReviewLog();
        l.setProgress(progress);
        l.setRating(rating);
        l.setReviewedAt(reviewedAt);
        return l;
    }
}
