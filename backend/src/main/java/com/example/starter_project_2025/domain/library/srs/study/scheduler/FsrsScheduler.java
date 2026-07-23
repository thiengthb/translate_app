package com.example.starter_project_2025.domain.library.srs.study.scheduler;

import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/** FSRS-5 scheduler (Free Spaced Repetition Scheduler). */
@Component
public class FsrsScheduler implements SrsScheduler {

    /** Forgetting-curve exponent (FSRS-5 fixes this at -0.5). */
    private static final double DECAY = -0.5;
    /** FACTOR = 0.9^(1/DECAY) - 1, so that R = 0.9 exactly when elapsed == stability. */
    private static final double FACTOR = Math.pow(0.9, 1.0 / DECAY) - 1.0;

    /** py-fsrs v4.1.2 default FSRS-5 weights (19 values). */
    private static final double[] DEFAULT_PARAMETERS = {
            0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604,
            0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
            2.2698, 0.2315, 2.9898, 0.51655, 0.6621
    };

    @Override
    public SchedulerType type() {
        return SchedulerType.FSRS;
    }

    @Override
    public ScheduleResult review(AnkiSrsProgress progress, Rating rating, SchedulingConfig config, LocalDateTime now) {
        apply(progress, rating, config, now);
        return new ScheduleResult(progress, SchedulerType.FSRS);
    }

    @Override
    public PreviewResult preview(AnkiSrsProgress progress, SchedulingConfig config, LocalDateTime now) {
        return PreviewResult.builder()
                .again(previewLabel(progress, Rating.AGAIN, config, now))
                .hard(previewLabel(progress, Rating.HARD, config, now))
                .good(previewLabel(progress, Rating.GOOD, config, now))
                .easy(previewLabel(progress, Rating.EASY, config, now))
                .build();
    }

    /* ──────────────────────────────────────────
       Core review — mirrors py-fsrs Scheduler.review_card
    ────────────────────────────────────────── */

    private void apply(AnkiSrsProgress p, Rating rating, SchedulingConfig config, LocalDateTime now) {
        double[] w = parameters(config);
        double desiredRetention = clamp(config.desiredRetention, 0.70, 0.98);
        int maxInterval = config.maxIntervalDays;
        List<Duration> learningSteps = config.learningSteps;
        List<Duration> relearningSteps = config.relearningSteps;

        String state = p.getState() != null ? p.getState() : "NEW";
        int step = nvl(p.getLearningStepIndex());

        if (p.getFirstLearnedAt() == null) {
            p.setFirstLearnedAt(now);
        }
        p.setReviewCount(nvl(p.getReviewCount()) + 1);

        // Integer day gap since the previous review (py-fsrs uses timedelta.days).
        Integer daysSince = p.getLastReviewedAt() != null
                ? (int) Math.max(0, ChronoUnit.DAYS.between(p.getLastReviewedAt(), now))
                : null;

        // Recall probability at the moment of this review (pre-update), for
        // display/logging only — the long-term stability update recomputes it.
        Double retrievabilityPre = (p.getStability() != null && p.getLastReviewedAt() != null)
                ? retrievability(daysSince == null ? 0 : daysSince, p.getStability())
                : null;

        updateMemory(p, rating, w, daysSince);
        double stability = p.getStability();

        Duration stepInterval = null;   // non-null ⇒ sub-day (re)learning step
        Integer dayInterval = null;     // non-null ⇒ whole-day review interval
        int nextStep = step;
        String nextState;

        if ("NEW".equals(state) || "LEARNING".equals(state)) {
            if (learningSteps.isEmpty() || step >= learningSteps.size()) {
                nextState = "REVIEW";
                nextStep = 0;
                dayInterval = nextInterval(stability, desiredRetention, maxInterval);
            } else {
                switch (rating) {
                    case AGAIN -> {
                        nextState = "LEARNING";
                        nextStep = 0;
                        stepInterval = learningSteps.get(0);
                    }
                    case HARD -> {
                        nextState = "LEARNING";
                        nextStep = step;
                        stepInterval = hardStepInterval(learningSteps, step);
                    }
                    case EASY -> {
                        nextState = "REVIEW";
                        nextStep = 0;
                        dayInterval = nextInterval(stability, desiredRetention, maxInterval);
                    }
                    default -> { // GOOD
                        if (step + 1 >= learningSteps.size()) {
                            nextState = "REVIEW";
                            nextStep = 0;
                            dayInterval = nextInterval(stability, desiredRetention, maxInterval);
                        } else {
                            nextState = "LEARNING";
                            nextStep = step + 1;
                            stepInterval = learningSteps.get(nextStep);
                        }
                    }
                }
            }
        } else if ("REVIEW".equals(state)) {
            if (rating == Rating.AGAIN) {
                p.setLapses(nvl(p.getLapses()) + 1);
                if (relearningSteps.isEmpty()) {
                    nextState = "REVIEW";
                    nextStep = 0;
                    dayInterval = nextInterval(stability, desiredRetention, maxInterval);
                } else {
                    nextState = "RELEARNING";
                    nextStep = 0;
                    stepInterval = relearningSteps.get(0);
                }
            } else {
                nextState = "REVIEW";
                nextStep = 0;
                dayInterval = nextInterval(stability, desiredRetention, maxInterval);
            }
        } else { // RELEARNING
            if (relearningSteps.isEmpty() || step >= relearningSteps.size()) {
                nextState = "REVIEW";
                nextStep = 0;
                dayInterval = nextInterval(stability, desiredRetention, maxInterval);
            } else {
                switch (rating) {
                    case AGAIN -> {
                        nextState = "RELEARNING";
                        nextStep = 0;
                        stepInterval = relearningSteps.get(0);
                    }
                    case HARD -> {
                        nextState = "RELEARNING";
                        nextStep = step;
                        stepInterval = hardStepInterval(relearningSteps, step);
                    }
                    case EASY -> {
                        nextState = "REVIEW";
                        nextStep = 0;
                        dayInterval = nextInterval(stability, desiredRetention, maxInterval);
                    }
                    default -> { // GOOD
                        if (step + 1 >= relearningSteps.size()) {
                            nextState = "REVIEW";
                            nextStep = 0;
                            dayInterval = nextInterval(stability, desiredRetention, maxInterval);
                        } else {
                            nextState = "RELEARNING";
                            nextStep = step + 1;
                            stepInterval = relearningSteps.get(nextStep);
                        }
                    }
                }
            }
        }

        p.setState(nextState);
        p.setLearningStepIndex(nextStep);
        if (dayInterval != null) {
            p.setIntervalDays(dayInterval);
            p.setScheduledDays(dayInterval);
            p.setNextReviewAt(now.plusDays(dayInterval));
        } else {
            p.setIntervalDays(0);
            p.setScheduledDays(0);
            p.setNextReviewAt(now.plus(stepInterval));
        }
        p.setElapsedDays(daysSince != null ? daysSince : 0);
        p.setRetrievability(retrievabilityPre);
        p.setMemoryScore(retrievabilityPre != null ? (double) Math.round(retrievabilityPre * 100) : 0.0);
        p.setLastRating(rating.name());
        p.setLastReviewedAt(now);
        p.setAlgorithmType("FSRS");
    }

    /** Updates difficulty + stability in place (py-fsrs: init / short-term / long-term). */
    private void updateMemory(AnkiSrsProgress p, Rating rating, double[] w, Integer daysSince) {
        Double s = p.getStability();
        Double d = p.getDifficulty();

        if (s == null && d == null) {
            p.setStability(initialStability(w, rating));
            p.setDifficulty(initialDifficulty(w, rating));
        } else if (daysSince != null && daysSince < 1) {
            // Same-day re-review: short-term stability (no retrievability needed).
            p.setStability(shortTermStability(w, s, rating));
            p.setDifficulty(nextDifficulty(w, d, rating));
        } else {
            double r = retrievability(daysSince == null ? 0 : daysSince, s);
            p.setStability(nextStability(w, d, s, r, rating));
            p.setDifficulty(nextDifficulty(w, d, rating));
        }
    }

    /* ── FSRS-5 math (each method = one py-fsrs helper) ── */

    /** S₀(G) = w[G-1], floored at 0.1. */
    private double initialStability(double[] w, Rating rating) {
        return Math.max(w[rating.ordinal()], 0.1);
    }

    /** D₀(G) = w4 - e^(w5·(G-1)) + 1, clamped to [1, 10]. */
    private double initialDifficulty(double[] w, Rating rating) {
        int g = rating.ordinal() + 1;
        double d = w[4] - Math.exp(w[5] * (g - 1)) + 1.0;
        return clamp(d, 1.0, 10.0);
    }

    /** R(t, S) = (1 + FACTOR·t/S)^DECAY. */
    private double retrievability(int elapsedDays, double stability) {
        return Math.pow(1.0 + FACTOR * elapsedDays / stability, DECAY);
    }

    /** I(R, S) = (S/FACTOR)·(R^(1/DECAY) - 1), rounded to whole days, clamped [1, max]. */
    private int nextInterval(double stability, double desiredRetention, int maxInterval) {
        double interval = (stability / FACTOR) * (Math.pow(desiredRetention, 1.0 / DECAY) - 1.0);
        long rounded = Math.round(interval);
        return (int) Math.max(1, Math.min(rounded, maxInterval));
    }

    /** Same-day stability bump: S·e^(w17·(G-3+w18)). */
    private double shortTermStability(double[] w, double stability, Rating rating) {
        int g = rating.ordinal() + 1;
        return stability * Math.exp(w[17] * (g - 3 + w[18]));
    }

    /** Difficulty update: linear damping toward 10, then mean-reversion to D₀(Easy). */
    private double nextDifficulty(double[] w, double difficulty, Rating rating) {
        int g = rating.ordinal() + 1;
        double arg1 = initialDifficulty(w, Rating.EASY);
        double deltaDifficulty = -(w[6] * (g - 3));
        double arg2 = difficulty + (10.0 - difficulty) * deltaDifficulty / 9.0; // linear damping
        double next = w[7] * arg1 + (1.0 - w[7]) * arg2;                        // mean reversion
        return clamp(next, 1.0, 10.0);
    }

    private double nextStability(double[] w, double difficulty, double stability, double retrievability, Rating rating) {
        return rating == Rating.AGAIN
                ? nextForgetStability(w, difficulty, stability, retrievability)
                : nextRecallStability(w, difficulty, stability, retrievability, rating);
    }

    /** Stability after a successful recall (Hard/Good/Easy). */
    private double nextRecallStability(double[] w, double d, double s, double r, Rating rating) {
        double hardPenalty = rating == Rating.HARD ? w[15] : 1.0;
        double easyBonus = rating == Rating.EASY ? w[16] : 1.0;
        return s * (1.0
                + Math.exp(w[8])
                * (11.0 - d)
                * Math.pow(s, -w[9])
                * (Math.exp((1.0 - r) * w[10]) - 1.0)
                * hardPenalty
                * easyBonus);
    }

    /** Stability after a lapse (Again), capped by the short-term term (py-fsrs FSRS-5). */
    private double nextForgetStability(double[] w, double d, double s, double r) {
        double longTerm = w[11]
                * Math.pow(d, -w[12])
                * (Math.pow(s + 1.0, w[13]) - 1.0)
                * Math.exp((1.0 - r) * w[14]);
        double shortTerm = s / Math.exp(w[17] * w[18]);
        return Math.min(longTerm, shortTerm);
    }

    /* ── (re)learning step helpers — mirror py-fsrs Hard-on-step behaviour ── */

    private Duration hardStepInterval(List<Duration> steps, int step) {
        if (step == 0 && steps.size() == 1) {
            return Duration.ofMillis(Math.round(steps.get(0).toMillis() * 1.5));
        }
        if (step == 0 && steps.size() >= 2) {
            return Duration.ofMillis((steps.get(0).toMillis() + steps.get(1).toMillis()) / 2);
        }
        return steps.get(Math.min(step, steps.size() - 1));
    }

    /* ── Preview (no mutation; runs on a throw-away copy) ── */

    private String previewLabel(AnkiSrsProgress source, Rating rating, SchedulingConfig config, LocalDateTime now) {
        AnkiSrsProgress copy = copyForPreview(source);
        apply(copy, rating, config, now);
        return label(now, copy.getNextReviewAt());
    }

    private AnkiSrsProgress copyForPreview(AnkiSrsProgress p) {
        AnkiSrsProgress c = new AnkiSrsProgress();
        if (p != null) {
            c.setState(p.getState());
            c.setStability(p.getStability());
            c.setDifficulty(p.getDifficulty());
            c.setIntervalDays(p.getIntervalDays());
            c.setReviewCount(p.getReviewCount());
            c.setLapses(p.getLapses());
            c.setLearningStepIndex(p.getLearningStepIndex());
            c.setLastReviewedAt(p.getLastReviewedAt());
            c.setFirstLearnedAt(p.getFirstLearnedAt());
            c.setNextReviewAt(p.getNextReviewAt());
            c.setRetrievability(p.getRetrievability());
            c.setScheduledDays(p.getScheduledDays());
            c.setEaseFactor(p.getEaseFactor());
            c.setMemoryScore(p.getMemoryScore());
        } else {
            c.setState("NEW");
        }
        return c;
    }

    /** Human label for the gap between now and the next due time (matches SM-2 preview). */
    private String label(LocalDateTime now, LocalDateTime next) {
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

    /* ── small helpers ── */

    private double[] parameters(SchedulingConfig config) {
        double[] p = config.fsrsParameters;
        return (p != null && p.length >= 19) ? p : DEFAULT_PARAMETERS;
    }

    private int nvl(Integer value) {
        return value != null ? value : 0;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
