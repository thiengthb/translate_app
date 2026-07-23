package com.example.starter_project_2025.init;

import com.example.starter_project_2025.domain.kanji_study.detail_word.KanjiVocabularyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Backfills the {@code kanji_detail_words} join (word ↔ kanji) for words that
 * have no links yet. Idempotent and cheap on re-run, so it can run on every boot.
 *
 * <p>Vocabulary and kanji are user-seeded (manual create / Excel import), not
 * created by an initializer — this simply links whatever already exists. After
 * a fresh seed without a restart, the same effect is available on demand via
 * {@code POST /api/kanji-details/relink-words}.</p>
 */
@Slf4j
@Order(20)
@Component
@RequiredArgsConstructor
public class KanjiVocabBackfillInitializer implements CommandLineRunner {

    private final KanjiVocabularyService kanjiVocabularyService;

    @Override
    public void run(String... args) {
        try {
            int created = kanjiVocabularyService.relinkAllMissing();
            if (created > 0) {
                log.info("Kanji vocabulary backfill: created {} word→kanji link(s).", created);
            }
        } catch (Exception e) {
            // Non-fatal — linking must not block application startup.
            log.warn("Kanji vocabulary backfill skipped due to error: {}", e.getMessage());
        }
    }
}
