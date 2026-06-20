package com.example.starter_project_2025.domain.grammar.scheduler;

import com.example.starter_project_2025.domain.grammar.progress.GrammarProgress;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure unit tests pinning the SM2 behaviour of {@link GrammarScheduler}. No Spring
 * context — the scheduler is self-contained, so we drive it with an explicit
 * {@code now} and assert the resulting state transitions / intervals.
 */
class GrammarSchedulerTest {

    private final GrammarScheduler scheduler = new GrammarScheduler();
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 1, 1, 12, 0);

    private GrammarProgress newCard() {
        GrammarProgress p = new GrammarProgress();
        p.setState(SrsState.NEW.name());
        return p;
    }

    private GrammarProgress reviewCard(int intervalDays, double ease) {
        GrammarProgress p = new GrammarProgress();
        p.setState(SrsState.REVIEW.name());
        p.setIntervalDays(intervalDays);
        p.setEaseFactor(ease);
        return p;
    }

    @Test
    void newCardGood_advancesToSecondLearningStep() {
        GrammarProgress p = newCard();

        scheduler.applyRating(p, Rating.GOOD, NOW);

        assertEquals(SrsState.LEARNING.name(), p.getState());
        assertEquals(NOW.plusMinutes(10), p.getNextReviewAt()); // second learning step
        assertEquals(1, p.getReviewCount());
    }

    @Test
    void newCardGoodTwice_graduatesToReview() {
        GrammarProgress p = newCard();

        scheduler.applyRating(p, Rating.GOOD, NOW);          // step 1m -> step 10m
        scheduler.applyRating(p, Rating.GOOD, NOW);          // past last step -> graduate

        assertEquals(SrsState.REVIEW.name(), p.getState());
        assertEquals(1, p.getIntervalDays());                // graduatingIntervalDays
        assertEquals(NOW.plusDays(1), p.getNextReviewAt());
    }

    @Test
    void newCardEasy_graduatesWithEasyInterval() {
        GrammarProgress p = newCard();

        scheduler.applyRating(p, Rating.EASY, NOW);

        assertEquals(SrsState.REVIEW.name(), p.getState());
        assertEquals(4, p.getIntervalDays());                // easyIntervalDays
        assertEquals(NOW.plusDays(4), p.getNextReviewAt());
    }

    @Test
    void reviewGood_growsIntervalByEase() {
        GrammarProgress p = reviewCard(10, 2.5);

        scheduler.applyRating(p, Rating.GOOD, NOW);

        // base 10 * ease 2.5 * modifier 1.0 = 25
        assertEquals(25, p.getIntervalDays());
        assertEquals(SrsState.REVIEW.name(), p.getState());
        assertEquals(NOW.plusDays(25), p.getNextReviewAt());
    }

    @Test
    void reviewAgain_lapsesAndEntersRelearning() {
        GrammarProgress p = reviewCard(20, 2.5);

        scheduler.applyRating(p, Rating.AGAIN, NOW);

        assertEquals(SrsState.RELEARNING.name(), p.getState());
        assertEquals(1, p.getLapses());
        assertEquals(2.3, p.getEaseFactor(), 1e-9);          // 2.5 - 0.20
        assertEquals(NOW.plusMinutes(10), p.getNextReviewAt()); // first relearning step
    }

    @Test
    void easeNeverDropsBelowMinimum() {
        GrammarProgress p = reviewCard(20, 1.3);             // already at the floor

        scheduler.applyRating(p, Rating.AGAIN, NOW);

        assertTrue(p.getEaseFactor() >= 1.3);
    }

    @Test
    void isDue_respectsStateAndNextReviewAt() {
        GrammarProgress past = reviewCard(10, 2.5);
        past.setNextReviewAt(NOW.minusDays(1));
        assertTrue(scheduler.isDue(past, NOW));

        GrammarProgress future = reviewCard(10, 2.5);
        future.setNextReviewAt(NOW.plusDays(1));
        assertFalse(scheduler.isDue(future, NOW));

        GrammarProgress learningNoDate = new GrammarProgress();
        learningNoDate.setState(SrsState.LEARNING.name());
        assertTrue(scheduler.isDue(learningNoDate, NOW)); // learning + null date == due now
    }

    @Test
    void enumParsing_fallsBackSafely() {
        assertEquals(SrsState.NEW, SrsState.from(null));
        assertEquals(SrsState.NEW, SrsState.from("garbage"));
        assertEquals(SrsState.REVIEW, SrsState.from("review"));
        assertEquals(Rating.GOOD, Rating.from(null));
        assertEquals(Rating.GOOD, Rating.from("nonsense"));
        assertEquals(Rating.AGAIN, Rating.from("again"));
    }
}
