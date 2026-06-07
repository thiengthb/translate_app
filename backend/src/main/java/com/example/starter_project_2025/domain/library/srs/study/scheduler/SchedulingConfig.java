package com.example.starter_project_2025.domain.library.srs.study.scheduler;

import com.example.starter_project_2025.domain.library.srs.srs_setting.AnkiSrsSetting;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Resolved scheduling configuration for one deck/user, built from
 * {@link AnkiSrsSetting} and its linked {@code SrsAlgorithmConfig.configJson}.
 *
 * <p>It carries BOTH the SM-2 knobs (active today) and the FSRS knobs (future).
 * Fields are intentionally {@code public}: this is a short-lived, per-request
 * value object read directly by the schedulers — no getters/boilerplate needed.
 *
 * <p>Moved out of {@code AnkiStudyController} so multiple schedulers can share it.
 */
public class SchedulingConfig {

    /* ── Algorithm discriminator ── */
    /** "SM2" (default) or "FSRS". */
    public String algorithmType = "SM2";

    /* ── SM-2 knobs (currently active) ── */
    public List<Duration> learningSteps = List.of(Duration.ofMinutes(1), Duration.ofMinutes(10));
    public List<Duration> relearningSteps = List.of(Duration.ofMinutes(10));
    public int graduatingIntervalDays = 1;
    public int easyIntervalDays = 4;
    public int maxIntervalDays = 36500;
    public double startingEase = 2.5;
    public double minEase = 1.3;
    public double easyBonus = 1.3;
    public double hardInterval = 1.2;
    public double intervalModifier = 1.0;
    public double newInterval = 0.0;
    public double targetRetention = 0.9;

    /* ── FSRS knobs (FUTURE — parsed and carried, not yet applied) ── */
    /** Target recall probability when a card becomes due (FSRS). Mirrors
     *  {@code targetRetention} unless the preset overrides it. */
    public double desiredRetention = 0.9;
    /** FSRS weights. {@code null} means "use the FSRS default parameters". */
    public double[] fsrsParameters = null;
    /** Whether changing the algorithm/params should immediately recompute due
     *  dates of existing REVIEW cards. Default false (Anki's safe default). */
    public boolean rescheduleCardsOnChange = false;

    /**
     * Build the config from a user/deck setting. When no setting or no JSON is
     * present, the SM-2 defaults above are used (so behaviour is unchanged).
     */
    public static SchedulingConfig from(AnkiSrsSetting setting, ObjectMapper objectMapper) {
        SchedulingConfig config = new SchedulingConfig();

        if (setting != null && setting.getTargetRetention() != null) {
            config.targetRetention = setting.getTargetRetention();
            config.desiredRetention = setting.getTargetRetention();
        }
        // The linked preset declares the algorithm type (SM2 / FSRS / CUSTOM).
        if (setting != null && setting.getAlgorithmConfig() != null
                && setting.getAlgorithmConfig().getAlgorithmType() != null
                && !setting.getAlgorithmConfig().getAlgorithmType().isBlank()) {
            config.algorithmType = setting.getAlgorithmConfig().getAlgorithmType().trim().toUpperCase();
        }

        String json = setting != null && setting.getAlgorithmConfig() != null
                ? setting.getAlgorithmConfig().getConfigJson()
                : null;
        if (json == null || json.isBlank()) {
            return config;
        }

        try {
            JsonNode root = objectMapper.readTree(json);

            // A preset's JSON may override the algorithm type.
            if (root.hasNonNull("algorithmType")) {
                config.algorithmType = root.get("algorithmType").asText(config.algorithmType).trim().toUpperCase();
            }

            // ── SM-2 knobs ──
            config.learningSteps = readSteps(root, "learningSteps", config.learningSteps);
            config.relearningSteps = readSteps(root, "relearningSteps", config.relearningSteps);
            config.graduatingIntervalDays = readInt(root, "graduatingIntervalDays", config.graduatingIntervalDays, 1, 36500);
            config.easyIntervalDays = readInt(root, "easyIntervalDays", config.easyIntervalDays, 1, 36500);
            config.maxIntervalDays = readInt(root, "maxIntervalDays", config.maxIntervalDays, 1, 36500);
            config.startingEase = readDouble(root, "startingEase", config.startingEase, 1.3, 5.0);
            config.minEase = readDouble(root, "minEase", config.minEase, 1.3, 5.0);
            config.easyBonus = readDouble(root, "easyBonus", config.easyBonus, 1.0, 5.0);
            config.hardInterval = readDouble(root, "hardInterval", config.hardInterval, 1.0, 5.0);
            config.intervalModifier = readDouble(root, "intervalModifier", config.intervalModifier, 0.1, 5.0);
            config.newInterval = readDouble(root, "newInterval", config.newInterval, 0.0, 1.0);

            // ── FSRS knobs (future) ──
            config.maxIntervalDays = readInt(root, "maximumIntervalDays", config.maxIntervalDays, 1, 36500);
            config.desiredRetention = readDouble(root, "desiredRetention", config.desiredRetention, 0.70, 0.98);
            config.rescheduleCardsOnChange = root.hasNonNull("rescheduleCardsOnChange")
                    && root.get("rescheduleCardsOnChange").asBoolean(false);
            config.fsrsParameters = readDoubleArray(root, "parameters");
        } catch (Exception ignored) {
            return config;
        }

        config.easyIntervalDays = Math.max(config.graduatingIntervalDays + 1, config.easyIntervalDays);
        config.maxIntervalDays = Math.max(config.easyIntervalDays, config.maxIntervalDays);
        return config;
    }

    /* ── JSON parsing helpers (moved verbatim from the controller) ── */

    private static List<Duration> readSteps(JsonNode root, String field, List<Duration> fallback) {
        JsonNode node = root.get(field);
        if (node == null || node.isNull()) return fallback;

        List<Duration> result = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(item -> {
                Duration parsed = parseStep(item.asText());
                if (parsed != null) result.add(parsed);
            });
        } else {
            for (String token : node.asText("").split("\\s+")) {
                Duration parsed = parseStep(token);
                if (parsed != null) result.add(parsed);
            }
        }
        return result.isEmpty() ? fallback : result;
    }

    private static Duration parseStep(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String token = raw.trim().toLowerCase();
        try {
            if (token.endsWith("m")) {
                return Duration.ofMinutes(Long.parseLong(token.substring(0, token.length() - 1)));
            }
            if (token.endsWith("h")) {
                return Duration.ofHours(Long.parseLong(token.substring(0, token.length() - 1)));
            }
            if (token.endsWith("d")) {
                return Duration.ofDays(Long.parseLong(token.substring(0, token.length() - 1)));
            }
            return Duration.ofMinutes(Long.parseLong(token));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static int readInt(JsonNode root, String field, int fallback, int min, int max) {
        JsonNode node = root.get(field);
        if (node == null || !node.isNumber()) return fallback;
        int value = node.asInt(fallback);
        return Math.max(min, Math.min(max, value));
    }

    private static double readDouble(JsonNode root, String field, double fallback, double min, double max) {
        JsonNode node = root.get(field);
        if (node == null || !node.isNumber()) return fallback;
        double value = node.asDouble(fallback);
        return Math.max(min, Math.min(max, value));
    }

    private static double[] readDoubleArray(JsonNode root, String field) {
        JsonNode node = root.get(field);
        if (node == null || !node.isArray() || node.isEmpty()) return null;
        double[] arr = new double[node.size()];
        for (int i = 0; i < node.size(); i++) arr[i] = node.get(i).asDouble();
        return arr;
    }
}
