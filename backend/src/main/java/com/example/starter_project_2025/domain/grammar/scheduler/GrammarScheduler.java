package com.example.starter_project_2025.domain.grammar.scheduler;

import com.example.starter_project_2025.domain.grammar.progress.GrammarProgress;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Anki-style SM2 spaced-repetition scheduler for grammar points.
 *
 * <p><b>Self-contained by design.</b> This is an intentional copy of the SM2
 * logic that lives in the Anki module's {@code AnkiStudyController}. The grammar
 * module owns its own scheduling so it never imports or modifies the Anki
 * module. The duplication is the price of full isolation.</p>
 *
 * <p>Ratings are the deterministic binary/quaternary signals
 * {@link Rating#AGAIN} / {@link Rating#HARD} / {@link Rating#GOOD} /
 * {@link Rating#EASY} produced mechanically (e.g. by a cloze fill-in check),
 * never by an LLM. This keeps {@code nextReviewAt} trustworthy.</p>
 */
@Service
public class GrammarScheduler {

    private final SchedulingConfig config = new SchedulingConfig();

    /** Apply a rating to the progress, mutating its SRS state in place (uses now). */
    public void applyRating(GrammarProgress progress, Rating rating) {
        applyRating(progress, rating, LocalDateTime.now());
    }

    /** Apply a rating at an explicit instant (testable). */
    public void applyRating(GrammarProgress progress, Rating rating, LocalDateTime now) {
        SrsState state = SrsState.from(progress.getState());

        if (progress.getFirstLearnedAt() == null) {
            progress.setFirstLearnedAt(now);
        }

        progress.setReviewCount(nvl(progress.getReviewCount()) + 1);

        switch (state) {
            case REVIEW -> applyReviewAnswer(progress, rating, now);
            case RELEARNING -> applyLearningAnswer(progress, rating, now, true);
            default -> applyLearningAnswer(progress, rating, now, false); // NEW / LEARNING
        }

        progress.setLastRating(rating.name());
        progress.setLastReviewedAt(now);
        progress.setMemoryScore(memoryScore(progress.getEaseFactor()));
    }

    /** Whether the progress is currently due for review. */
    public boolean isDue(GrammarProgress p, LocalDateTime now) {
        SrsState state = SrsState.from(p.getState());
        if (state == SrsState.LEARNING || state == SrsState.RELEARNING) {
            return p.getNextReviewAt() == null || !p.getNextReviewAt().isAfter(now);
        }
        return p.getNextReviewAt() != null && !p.getNextReviewAt().isAfter(now);
    }

    /** Human-readable preview of when the card would next be due for the given rating. */
    public String previewLabel(GrammarProgress source, Rating rating) {
        GrammarProgress copy = copyOf(source);
        LocalDateTime now = LocalDateTime.now();
        applyRating(copy, rating, now);
        LocalDateTime next = copy.getNextReviewAt();
        if (next == null) return "-";

        long minutes = Math.max(0, ChronoUnit.MINUTES.between(now, next));
        if (minutes < 1) return "< 1m";
        if (minutes < 60) return minutes + "m";

        long hours = Math.max(1, ChronoUnit.HOURS.between(now, next));
        if (hours < 24) return hours + "h";

        long days = Math.max(1, ChronoUnit.DAYS.between(now.toLocalDate(), next.toLocalDate()));
        if (days < 30) return days + "d";

        long months = Math.max(1, Math.round(days / 30.0));
        if (months < 24) return months + "mo";

        return Math.round(days / 365.0) + "y";
    }

    /* ── Learning / relearning steps ── */
    private void applyLearningAnswer(
            GrammarProgress progress, Rating rating, LocalDateTime now, boolean relearning
    ) {
        List<Duration> steps = relearning ? config.relearningSteps : config.learningSteps;
        String learningState = (relearning ? SrsState.RELEARNING : SrsState.LEARNING).name();

        if (steps.isEmpty()) {
            graduate(progress, relearning ? progress.getIntervalDays() : config.graduatingIntervalDays, now);
            return;
        }

        int currentStep = clamp(nvl(progress.getLearningStepIndex()), 0, steps.size() - 1);

        switch (rating) {
            case AGAIN -> {
                progress.setState(learningState);
                progress.setLearningStepIndex(0);
                progress.setNextReviewAt(now.plus(steps.get(0)));
            }
            case HARD -> {
                Duration againDelay = steps.get(currentStep);
                Duration goodDelay = currentStep + 1 < steps.size()
                        ? steps.get(currentStep + 1)
                        : Duration.ofDays(Math.max(1, relearning
                                ? nvl(progress.getIntervalDays(), 1)
                                : config.graduatingIntervalDays));
                Duration hardDelay = average(againDelay, goodDelay);
                progress.setState(learningState);
                progress.setLearningStepIndex(currentStep);
                progress.setNextReviewAt(now.plus(hardDelay));
            }
            case EASY -> graduate(progress, relearning
                    ? Math.max(nvl(progress.getIntervalDays(), 1), config.graduatingIntervalDays)
                    : config.easyIntervalDays, now);
            default -> { // GOOD
                if (currentStep + 1 >= steps.size()) {
                    graduate(progress, relearning ? progress.getIntervalDays() : config.graduatingIntervalDays, now);
                } else {
                    int nextStep = currentStep + 1;
                    progress.setState(learningState);
                    progress.setLearningStepIndex(nextStep);
                    progress.setNextReviewAt(now.plus(steps.get(nextStep)));
                }
            }
        }
    }

    /* ── Review answers ── */
    private void applyReviewAnswer(GrammarProgress progress, Rating rating, LocalDateTime now) {
        int currentInterval = Math.max(1, nvl(progress.getIntervalDays(), 1));
        int daysLate = progress.getNextReviewAt() != null && progress.getNextReviewAt().isBefore(now)
                ? (int) Math.max(0, ChronoUnit.DAYS.between(progress.getNextReviewAt(), now))
                : 0;
        double ease = Math.max(config.minEase, nvl(progress.getEaseFactor(), config.startingEase));
        double intervalModifier = config.intervalModifier * retentionModifier(config.targetRetention);

        switch (rating) {
            case AGAIN -> {
                progress.setEaseFactor(Math.max(config.minEase, ease - 0.20));
                progress.setLapses(nvl(progress.getLapses()) + 1);
                progress.setLearningStepIndex(0);

                int relearnInterval = config.newInterval <= 0
                        ? 1
                        : clampInterval((int) Math.round(currentInterval * config.newInterval), 1, config.maxIntervalDays);
                progress.setIntervalDays(relearnInterval);

                if (config.relearningSteps.isEmpty()) {
                    progress.setState(SrsState.REVIEW.name());
                    progress.setNextReviewAt(now.plusDays(relearnInterval));
                } else {
                    progress.setState(SrsState.RELEARNING.name());
                    progress.setNextReviewAt(now.plus(config.relearningSteps.get(0)));
                }
            }
            case HARD -> {
                progress.setEaseFactor(Math.max(config.minEase, ease - 0.15));
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 0.25, config.hardInterval, intervalModifier
                );
                scheduleReview(progress, nextInterval, now);
            }
            case EASY -> {
                progress.setEaseFactor(ease + 0.15);
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 1.0, ease * config.easyBonus, intervalModifier
                );
                scheduleReview(progress, nextInterval, now);
            }
            default -> { // GOOD
                progress.setEaseFactor(ease);
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 0.5, ease, intervalModifier
                );
                scheduleReview(progress, nextInterval, now);
            }
        }
    }

    private int nextReviewInterval(
            int currentInterval, int daysLate, double lateMultiplier,
            double answerMultiplier, double intervalModifier
    ) {
        double base = currentInterval + (daysLate * lateMultiplier);
        int computed = (int) Math.round(base * answerMultiplier * intervalModifier);
        return clampInterval(computed, currentInterval + 1, config.maxIntervalDays);
    }

    private void graduate(GrammarProgress progress, Integer intervalDays, LocalDateTime now) {
        int interval = clampInterval(nvl(intervalDays, config.graduatingIntervalDays), 1, config.maxIntervalDays);
        progress.setState(SrsState.REVIEW.name());
        progress.setLearningStepIndex(0);
        progress.setEaseFactor(Math.max(config.minEase, nvl(progress.getEaseFactor(), config.startingEase)));
        progress.setIntervalDays(interval);
        progress.setNextReviewAt(now.plusDays(interval));
    }

    private void scheduleReview(GrammarProgress progress, int intervalDays, LocalDateTime now) {
        progress.setState(SrsState.REVIEW.name());
        progress.setLearningStepIndex(0);
        progress.setIntervalDays(intervalDays);
        progress.setNextReviewAt(now.plusDays(intervalDays));
    }

    private GrammarProgress copyOf(GrammarProgress p) {
        GrammarProgress copy = new GrammarProgress();
        copy.setState(p != null && p.getState() != null ? p.getState() : SrsState.NEW.name());
        copy.setEaseFactor(p != null ? p.getEaseFactor() : config.startingEase);
        copy.setIntervalDays(p != null ? p.getIntervalDays() : 0);
        copy.setReviewCount(p != null ? p.getReviewCount() : 0);
        copy.setLapses(p != null ? p.getLapses() : 0);
        copy.setLearningStepIndex(p != null ? p.getLearningStepIndex() : 0);
        copy.setNextReviewAt(p != null ? p.getNextReviewAt() : null);
        copy.setFirstLearnedAt(p != null ? p.getFirstLearnedAt() : null);
        return copy;
    }

    /* ── Helpers ── */
    private int nvl(Integer value) { return value != null ? value : 0; }
    private int nvl(Integer value, int fallback) { return value != null ? value : fallback; }
    private double nvl(Double value, double fallback) { return value != null ? value : fallback; }

    private int clamp(int value, int min, int max) { return Math.max(min, Math.min(max, value)); }
    private int clampInterval(int value, int min, int max) { return Math.max(min, Math.min(max, value)); }

    private Duration average(Duration a, Duration b) {
        return Duration.ofMillis((a.toMillis() + b.toMillis()) / 2);
    }

    private double retentionModifier(double targetRetention) {
        double retention = Math.max(0.70, Math.min(0.98, targetRetention));
        double modifier = Math.pow(0.90 / retention, 2);
        return Math.max(0.50, Math.min(1.50, modifier));
    }

    private double memoryScore(Double easeFactor) {
        double ease = nvl(easeFactor, config.startingEase);
        return Math.min(100.0, Math.max(0.0, (ease - config.minEase) / (3.5 - config.minEase) * 100));
    }

    /** Self-contained default SM2 tuning (no external setting dependency). */
    private static final class SchedulingConfig {
        final List<Duration> learningSteps = List.of(Duration.ofMinutes(1), Duration.ofMinutes(10));
        final List<Duration> relearningSteps = List.of(Duration.ofMinutes(10));
        final int graduatingIntervalDays = 1;
        final int easyIntervalDays = 4;
        final int maxIntervalDays = 36500;
        final double startingEase = 2.5;
        final double minEase = 1.3;
        final double easyBonus = 1.3;
        final double hardInterval = 1.2;
        final double intervalModifier = 1.0;
        final double newInterval = 0.0;
        final double targetRetention = 0.9;
    }
}
