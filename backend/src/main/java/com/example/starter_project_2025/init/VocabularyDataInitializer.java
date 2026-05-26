package com.example.starter_project_2025.init;

import com.example.starter_project_2025.system.vocabulary.language.Language;
import com.example.starter_project_2025.system.vocabulary.language.LanguageRepository;
import com.example.starter_project_2025.system.vocabulary.level.Level;
import com.example.starter_project_2025.system.vocabulary.level.LevelRepository;
import com.example.starter_project_2025.system.vocabulary.meaning.Meaning;
import com.example.starter_project_2025.system.vocabulary.meaning.MeaningRepository;
import com.example.starter_project_2025.system.vocabulary.representation.Representation;
import com.example.starter_project_2025.system.vocabulary.representation.RepresentationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds canonical vocabulary master data so the frontend management pages
 * (and any developer hitting the API) have meaningful rows on first boot.
 *
 * Runs after RBAC + users (Order 1-3) and before menu generation (Order 10).
 * Idempotent: skips rows whose unique code already exists, so it is safe
 * on every restart (including ddl-auto=create-drop in H2 dev mode).
 */
@Slf4j
@Order(5)
@Component
@RequiredArgsConstructor
public class VocabularyDataInitializer implements CommandLineRunner {

    private final LanguageRepository languageRepository;
    private final LevelRepository levelRepository;
    private final RepresentationRepository representationRepository;
    private final MeaningRepository meaningRepository;

    @Override
    @Transactional
    public void run(String... args) {
        Map<String, Language> languages = seedLanguages();
        seedLevels();
        seedRepresentations();
        seedMeanings(languages);

        log.info("Ensured seed vocabulary data: languages, levels, representations, meanings.");
    }

    // ------------------------------------------------------------------
    // Languages: ja, vi, en   (per ERD note on languages.code)
    // ------------------------------------------------------------------
    private Map<String, Language> seedLanguages() {
        record Seed(String code, String name) {}

        List<Seed> seeds = List.of(
                new Seed("ja", "Japanese"),
                new Seed("vi", "Vietnamese"),
                new Seed("en", "English")
        );

        Map<String, Language> byCode = new HashMap<>();

        for (Seed s : seeds) {
            Language existing = findLanguageByCode(s.code());
            if (existing != null) {
                byCode.put(s.code(), existing);
                continue;
            }

            Language created = languageRepository.save(
                    Language.builder()
                            .code(s.code())
                            .name(s.name())
                            .build()
            );
            byCode.put(s.code(), created);
            log.info("Seeded language: {} ({})", s.code(), s.name());
        }

        return byCode;
    }

    // ------------------------------------------------------------------
    // Levels: N5, N4, N3, N2, N1   (per ERD note on levels.code)
    // ------------------------------------------------------------------
    private void seedLevels() {
        record Seed(String code, String name) {}

        List<Seed> seeds = List.of(
                new Seed("N5", "Beginner (N5)"),
                new Seed("N4", "Elementary (N4)"),
                new Seed("N3", "Intermediate (N3)"),
                new Seed("N2", "Upper-Intermediate (N2)"),
                new Seed("N1", "Advanced (N1)")
        );

        for (Seed s : seeds) {
            if (levelRepository.existsByCode(s.code())) {
                continue;
            }

            levelRepository.save(
                    Level.builder()
                            .code(s.code())
                            .name(s.name())
                            .build()
            );
            log.info("Seeded level: {} ({})", s.code(), s.name());
        }
    }

    // ------------------------------------------------------------------
    // Representations: KANJI, HIRAGANA, KATAKANA, ROMAJI
    // (per ERD note on representations.code)
    // ------------------------------------------------------------------
    private void seedRepresentations() {
        record Seed(String code, String name) {}

        List<Seed> seeds = List.of(
                new Seed("KANJI",    "Kanji"),
                new Seed("HIRAGANA", "Hiragana"),
                new Seed("KATAKANA", "Katakana"),
                new Seed("ROMAJI",   "Romaji")
        );

        for (Seed s : seeds) {
            if (representationRepository.existsByCode(s.code())) {
                continue;
            }

            representationRepository.save(
                    Representation.builder()
                            .code(s.code())
                            .name(s.name())
                            .build()
            );
            log.info("Seeded representation: {} ({})", s.code(), s.name());
        }
    }

    // ------------------------------------------------------------------
    // Meanings: small sample tied to each language so the Meaning page
    // shows real rows with FK joins (covers the @ManyToOne mapping path).
    // ------------------------------------------------------------------
    private void seedMeanings(Map<String, Language> languages) {
        record Seed(String languageCode, String name) {}

        // Skip entirely if any meaning already exists for a seeded language —
        // avoids duplicating sample meanings on every restart in a real DB.
        boolean anyExisting = languages.values().stream()
                .anyMatch(l -> meaningRepository.existsByLanguageId(l.getId()));
        if (anyExisting) {
            log.info("Skipping meaning seed; meanings already exist for at least one seeded language.");
            return;
        }

        List<Seed> seeds = List.of(
                // Japanese sample meanings
                new Seed("ja", "to eat"),
                new Seed("ja", "to drink"),
                new Seed("ja", "to go"),

                // Vietnamese sample meanings
                new Seed("vi", "ăn"),
                new Seed("vi", "uống"),
                new Seed("vi", "đi"),

                // English sample meanings
                new Seed("en", "to eat"),
                new Seed("en", "to drink"),
                new Seed("en", "to go")
        );

        for (Seed s : seeds) {
            Language lang = languages.get(s.languageCode());
            if (lang == null) {
                log.warn("Skipping meaning seed '{}': language '{}' not found", s.name(), s.languageCode());
                continue;
            }

            meaningRepository.save(
                    Meaning.builder()
                            .language(lang)
                            .name(s.name())
                            .build()
            );
        }

        log.info("Seeded {} sample meanings across {} languages.",
                seeds.size(), languages.size());
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /**
     * LanguageRepository only exposes existsByCode; do an active+non-deleted
     * lookup via findAll() since the dataset is tiny (3 rows) at seed time.
     * Avoids needing to extend the repository interface for a one-shot use.
     */
    private Language findLanguageByCode(String code) {
        return languageRepository.findAll().stream()
                .filter(l -> code.equals(l.getCode()))
                .findFirst()
                .orElse(null);
    }
}
