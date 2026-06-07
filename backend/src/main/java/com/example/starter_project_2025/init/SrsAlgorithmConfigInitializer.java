package com.example.starter_project_2025.init;

import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfig;
import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the two shared SRS algorithm presets so a user can pick a scheduler in
 * the deck study-settings modal on a fresh DB:
 * <ul>
 *   <li>{@code SM2_DEFAULT}  — the Anki-like SM-2 defaults.</li>
 *   <li>{@code FSRS_DEFAULT} — FSRS-5 with the canonical 19 default weights.</li>
 * </ul>
 *
 * <p>Without an {@code algorithm_type = FSRS} row here, FSRS would be
 * unreachable from the UI. Upserts by {@code code}, so it is idempotent and
 * safe to re-run (dev H2 wipes on restart; prod keeps the rows).
 */
@Slf4j
@Order(14)
@Component
@RequiredArgsConstructor
public class SrsAlgorithmConfigInitializer implements CommandLineRunner {

    private final SrsAlgorithmConfigRepository repository;

    private static final String SM2_DEFAULT_JSON = """
            {
              "scheduler": "ANKI_SM2",
              "learningSteps": "1m 10m",
              "relearningSteps": "10m",
              "graduatingIntervalDays": 1,
              "easyIntervalDays": 4,
              "maxIntervalDays": 36500,
              "startingEase": 2.5,
              "minEase": 1.3,
              "easyBonus": 1.3,
              "hardInterval": 1.2,
              "intervalModifier": 1.0,
              "newInterval": 0.0
            }""";

    // FSRS-5 default weights (open-spaced-repetition / py-fsrs v4.1.2).
    private static final String FSRS_DEFAULT_JSON = """
            {
              "algorithmType": "FSRS",
              "fsrsVersion": "FSRS-5",
              "desiredRetention": 0.9,
              "maximumIntervalDays": 36500,
              "learningSteps": "1m 10m",
              "relearningSteps": "10m",
              "parameters": [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604,
                             0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
                             2.2698, 0.2315, 2.9898, 0.51655, 0.6621],
              "rescheduleCardsOnChange": false
            }""";

    @Override
    @Transactional
    public void run(String... args) {
        upsert("SM2_DEFAULT", "Anki SM-2 (Default)", "SM2", SM2_DEFAULT_JSON);
        upsert("FSRS_DEFAULT", "FSRS-5 (Default)", "FSRS", FSRS_DEFAULT_JSON);
    }

    /** Creates the preset if missing; otherwise refreshes its name/type/JSON. */
    private void upsert(String code, String name, String algorithmType, String configJson) {
        SrsAlgorithmConfig config = repository.findByCode(code).orElseGet(SrsAlgorithmConfig::new);
        boolean isNew = config.getId() == null;

        config.setCode(code);
        config.setName(name);
        config.setAlgorithmType(algorithmType);
        config.setConfigJson(configJson);
        config.setEnabled(true);
        config.setIsActive(true);

        repository.save(config);
        log.info("SRS algorithm preset {}: {}", isNew ? "created" : "updated", code);
    }
}
