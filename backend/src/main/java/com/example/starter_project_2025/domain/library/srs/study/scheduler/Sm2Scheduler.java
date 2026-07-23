package com.example.starter_project_2025.domain.library.srs.study.scheduler;

import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Anki-like SM-2 scheduler — the CURRENT, fully-implemented algorithm.
 *
 * <p>This is the exact SM-2 logic that previously lived inside
 * {@code AnkiStudyController}, moved here verbatim so it can sit behind the
 * {@link SrsScheduler} contract. Behaviour is unchanged: states
 * NEW / LEARNING / REVIEW / RELEARNING, ratings AGAIN/HARD/GOOD/EASY,
 * ease_factor + interval_days scheduling.
 */
@Component
public class Sm2Scheduler implements SrsScheduler {

    @Override
    public SchedulerType type() {
        return SchedulerType.SM2;
    }

    @Override
    public ScheduleResult review(AnkiSrsProgress progress, Rating rating, SchedulingConfig config, LocalDateTime now) {
        applyAnkiSm2(progress, rating.name(), config, now);
        return new ScheduleResult(progress, SchedulerType.SM2);
    }

    @Override
    public PreviewResult preview(AnkiSrsProgress progress, SchedulingConfig config, LocalDateTime now) {
        return PreviewResult.builder()
                .again(previewLabel(progress, "AGAIN", config, now))
                .hard(previewLabel(progress, "HARD", config, now))
                .good(previewLabel(progress, "GOOD", config, now))
                .easy(previewLabel(progress, "EASY", config, now))
                .build();
    }

    /* ──────────────────────────────────────────
       Core SM-2 (moved verbatim from AnkiStudyController)
    ────────────────────────────────────────── */

    private void applyAnkiSm2(AnkiSrsProgress progress, String rating, SchedulingConfig config, LocalDateTime now) {
        String normalizedRating = normalizeRating(rating);
        String state = progress.getState() != null ? progress.getState() : "NEW";

        if (progress.getFirstLearnedAt() == null) {
            progress.setFirstLearnedAt(now);
        }

        progress.setReviewCount(nvl(progress.getReviewCount()) + 1);

        if ("REVIEW".equals(state)) {
            applyReviewAnswer(progress, normalizedRating, config, now);
        } else if ("RELEARNING".equals(state)) {
            applyLearningAnswer(progress, normalizedRating, config, now, true);
        } else {
            applyLearningAnswer(progress, normalizedRating, config, now, false);
        }

        progress.setLastRating(normalizedRating);
        progress.setLastReviewedAt(now);
        progress.setMemoryScore(memoryScore(progress.getEaseFactor(), config));
        progress.setAlgorithmType("SM2");
    }

    private void applyLearningAnswer(
            AnkiSrsProgress progress,
            String rating,
            SchedulingConfig config,
            LocalDateTime now,
            boolean relearning
    ) {
        List<Duration> steps = relearning ? config.relearningSteps : config.learningSteps;

        if (steps.isEmpty()) {
            graduate(progress, relearning ? progress.getIntervalDays() : config.graduatingIntervalDays, config, now);
            return;
        }

        int currentStep = clamp(nvl(progress.getLearningStepIndex()), 0, steps.size() - 1);

        switch (rating) {
            case "AGAIN" -> {
                progress.setState(relearning ? "RELEARNING" : "LEARNING");
                progress.setLearningStepIndex(0);
                progress.setNextReviewAt(now.plus(steps.get(0)));
            }
            case "HARD" -> {
                // Anki behaviour: on the FIRST step, Hard = average(Again, Good)
                // delays; on any later step, Hard simply REPEATS the current step.
                // It never borrows the graduating interval, so a learning/relearning
                // re-show always stays within the configured steps (≤ the last step,
                // e.g. ≤ 10m by default) instead of jumping to hours/days.
                Duration hardDelay = (currentStep == 0 && steps.size() >= 2)
                        ? average(steps.get(0), steps.get(1))
                        : steps.get(currentStep);
                progress.setState(relearning ? "RELEARNING" : "LEARNING");
                progress.setLearningStepIndex(currentStep);
                progress.setNextReviewAt(now.plus(hardDelay));
            }
            case "EASY" -> graduate(progress, relearning
                    ? Math.max(nvl(progress.getIntervalDays(), 1), config.graduatingIntervalDays)
                    : config.easyIntervalDays, config, now);
            default -> {
                if (currentStep + 1 >= steps.size()) {
                    graduate(progress, relearning ? progress.getIntervalDays() : config.graduatingIntervalDays, config, now);
                } else {
                    int nextStep = currentStep + 1;
                    progress.setState(relearning ? "RELEARNING" : "LEARNING");
                    progress.setLearningStepIndex(nextStep);
                    progress.setNextReviewAt(now.plus(steps.get(nextStep)));
                }
            }
        }
    }

    private void applyReviewAnswer(
            AnkiSrsProgress progress,
            String rating,
            SchedulingConfig config,
            LocalDateTime now
    ) {
        int currentInterval = Math.max(1, nvl(progress.getIntervalDays(), 1));
        int daysLate = progress.getNextReviewAt() != null && progress.getNextReviewAt().isBefore(now)
                ? (int) Math.max(0, ChronoUnit.DAYS.between(progress.getNextReviewAt(), now))
                : 0;
        double ease = Math.max(config.minEase, nvl(progress.getEaseFactor(), config.startingEase));
        double intervalModifier = config.intervalModifier * retentionModifier(config.targetRetention);

        switch (rating) {
            case "AGAIN" -> {
                progress.setEaseFactor(Math.max(config.minEase, ease - 0.20));
                progress.setLapses(nvl(progress.getLapses()) + 1);
                progress.setLearningStepIndex(0);

                int relearnInterval = config.newInterval <= 0
                        ? 1
                        : clampInterval((int) Math.round(currentInterval * config.newInterval), 1, config.maxIntervalDays);
                progress.setIntervalDays(relearnInterval);

                if (config.relearningSteps.isEmpty()) {
                    progress.setState("REVIEW");
                    progress.setNextReviewAt(now.plusDays(relearnInterval));
                } else {
                    progress.setState("RELEARNING");
                    progress.setNextReviewAt(now.plus(config.relearningSteps.get(0)));
                }
            }
            case "HARD" -> {
                progress.setEaseFactor(Math.max(config.minEase, ease - 0.15));
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 0.25, config.hardInterval, intervalModifier, config
                );
                scheduleReview(progress, nextInterval, now);
            }
            case "EASY" -> {
                progress.setEaseFactor(ease + 0.15);
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 1.0, ease * config.easyBonus, intervalModifier, config
                );
                scheduleReview(progress, nextInterval, now);
            }
            default -> {
                progress.setEaseFactor(ease);
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 0.5, ease, intervalModifier, config
                );
                scheduleReview(progress, nextInterval, now);
            }
        }
    }

    private int nextReviewInterval(
            int currentInterval,
            int daysLate,
            double lateMultiplier,
            double answerMultiplier,
            double intervalModifier,
            SchedulingConfig config
    ) {
        double base = currentInterval + (daysLate * lateMultiplier);
        int computed = (int) Math.round(base * answerMultiplier * intervalModifier);
        return clampInterval(computed, currentInterval + 1, config.maxIntervalDays);
    }

    private void graduate(AnkiSrsProgress progress, Integer intervalDays, SchedulingConfig config, LocalDateTime now) {
        int interval = clampInterval(nvl(intervalDays, config.graduatingIntervalDays), 1, config.maxIntervalDays);
        progress.setState("REVIEW");
        progress.setLearningStepIndex(0);
        progress.setEaseFactor(Math.max(config.minEase, nvl(progress.getEaseFactor(), config.startingEase)));
        progress.setIntervalDays(interval);
        progress.setNextReviewAt(now.plusDays(interval));
    }

    private void scheduleReview(AnkiSrsProgress progress, int intervalDays, LocalDateTime now) {
        progress.setState("REVIEW");
        progress.setLearningStepIndex(0);
        progress.setIntervalDays(intervalDays);
        progress.setNextReviewAt(now.plusDays(intervalDays));
    }

    /* ── Preview (no mutation; runs on a throw-away copy) ── */

    private AnkiSrsProgress previewSource(AnkiSrsProgress p, SchedulingConfig config) {
        AnkiSrsProgress copy = new AnkiSrsProgress();
        copy.setState(p != null ? p.getState() : "NEW");
        copy.setEaseFactor(p != null ? p.getEaseFactor() : config.startingEase);
        copy.setIntervalDays(p != null ? p.getIntervalDays() : 0);
        copy.setReviewCount(p != null ? p.getReviewCount() : 0);
        copy.setLapses(p != null ? p.getLapses() : 0);
        copy.setLearningStepIndex(p != null ? p.getLearningStepIndex() : 0);
        copy.setNextReviewAt(p != null ? p.getNextReviewAt() : null);
        copy.setFirstLearnedAt(p != null ? p.getFirstLearnedAt() : null);
        return copy;
    }

    private String previewLabel(AnkiSrsProgress source, String rating, SchedulingConfig config, LocalDateTime now) {
        AnkiSrsProgress copy = previewSource(source, config);
        applyAnkiSm2(copy, rating, config, now);
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

    /* ── small helpers (moved verbatim) ── */

    private String normalizeRating(String rating) {
        if (rating == null) return "GOOD";
        return switch (rating.toUpperCase()) {
            case "AGAIN", "HARD", "GOOD", "EASY" -> rating.toUpperCase();
            default -> "GOOD";
        };
    }

    private int nvl(Integer value) {
        return value != null ? value : 0;
    }

    private int nvl(Integer value, int fallback) {
        return value != null ? value : fallback;
    }

    private double nvl(Double value, double fallback) {
        return value != null ? value : fallback;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private int clampInterval(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private Duration average(Duration a, Duration b) {
        return Duration.ofMillis((a.toMillis() + b.toMillis()) / 2);
    }

    private double retentionModifier(double targetRetention) {
        double retention = Math.max(0.70, Math.min(0.98, targetRetention));
        double modifier = Math.pow(0.90 / retention, 2);
        return Math.max(0.50, Math.min(1.50, modifier));
    }

    private double memoryScore(Double easeFactor, SchedulingConfig config) {
        double ease = nvl(easeFactor, config.startingEase);
        return Math.min(100.0, Math.max(0.0, (ease - config.minEase) / (3.5 - config.minEase) * 100));
    }
}
