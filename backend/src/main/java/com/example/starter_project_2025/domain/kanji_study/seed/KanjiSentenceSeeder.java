package com.example.starter_project_2025.domain.kanji_study.seed;

import com.example.starter_project_2025.domain.kanji_study.detail_sentence.KanjiSentenceImportService;
import com.example.starter_project_2025.domain.kanji_study.detail_sentence.KanjiSentenceImportService.ImportResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Seeds {@code kanji_sentences} (+ {@code kanji_sentence_links}) from
 * {@code resources/seed/kanji-sentences-seed.json} on startup IF empty, by
 * delegating to {@link KanjiSentenceImportService}. Furigana is generated on
 * import (Sudachi). Runs after {@link KanjiStudyDataSeeder} (which creates
 * {@code kanji_details}). Idempotent — does nothing when the table already has
 * rows; use the {@code reimport-sentences} endpoint to replace an existing corpus.
 */
@Slf4j
@Component
@Order(51)
@RequiredArgsConstructor
public class KanjiSentenceSeeder implements CommandLineRunner {

    private final KanjiSentenceImportService importService;

    @Override
    public void run(String... args) {
        ImportResult result = importService.importFromSeed(false);
        if (result.sentences() > 0) {
            log.info("Kanji sentence seed: {} sentences, {} links, {} kanji.",
                    result.sentences(), result.links(), result.kanji());
        }
    }
}
