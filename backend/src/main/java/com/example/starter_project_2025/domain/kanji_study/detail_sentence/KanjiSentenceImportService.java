package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import com.example.starter_project_2025.domain.kanji_study.detail_word.KanjiVocabularyService;
import com.example.starter_project_2025.system.analyze.FuriganaSegment;
import com.example.starter_project_2025.system.analyze.FuriganaService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads example sentences from {@code resources/seed/kanji-sentences-seed.json}
 * into {@code kanji_sentences} (+ {@code kanji_sentence_links}), generating
 * furigana with {@link FuriganaService} (Sudachi) at import time so the stored
 * ruby always matches the running tokenizer.
 *
 * <p>Used by both {@link com.example.starter_project_2025.domain.kanji_study.seed.KanjiSentenceSeeder}
 * (boot, only when empty) and the {@code reimport-sentences} admin endpoint
 * (clears first, so a regenerated corpus replaces the old one).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KanjiSentenceImportService {

    /** Most sentences linked to a single kanji (keeps the detail page focused). */
    private static final int MAX_PER_KANJI = 30;

    /** Flush + clear the persistence context every this-many sentences. */
    private static final int BATCH = 500;

    /** Full generated corpus (gitignored), preferred when present. */
    private static final String SEED_FULL = "seed/kanji-sentences-seed.full.json";
    /** Committed sample, used when the full corpus hasn't been generated. */
    private static final String SEED_SAMPLE = "seed/kanji-sentences-seed.json";

    private final FuriganaService furiganaService;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager em;

    /** Result of an import run. */
    public record ImportResult(int sentences, int links, int kanji) {}

    /**
     * Import sentences from the seed file. When {@code clearFirst} is true the
     * existing sentences + links are deleted so a regenerated corpus replaces
     * them; otherwise nothing happens if the table already has rows.
     */
    @Transactional
    public ImportResult importFromSeed(boolean clearFirst) {
        Long existing = em.createQuery("SELECT count(s) FROM KanjiSentence s", Long.class)
                .getSingleResult();
        if (existing > 0) {
            if (!clearFirst) return new ImportResult(0, 0, 0);
            // Children first (FK), then parents.
            em.createQuery("DELETE FROM KanjiSentenceLink").executeUpdate();
            em.createQuery("DELETE FROM KanjiSentence").executeUpdate();
            em.flush();
            em.clear();
            log.info("Cleared existing kanji sentences before reimport.");
        }

        ClassPathResource resource = new ClassPathResource(SEED_FULL);
        if (!resource.exists()) {
            resource = new ClassPathResource(SEED_SAMPLE);
        }
        if (!resource.exists()) {
            log.warn("Kanji sentence seed file not found ({} or {}) — nothing imported.",
                    SEED_FULL, SEED_SAMPLE);
            return new ImportResult(0, 0, 0);
        }
        log.info("Importing kanji sentences from classpath:{}", resource.getPath());

        Map<String, Long> kanjiIdByChar = loadKanjiIdMap();
        if (kanjiIdByChar.isEmpty()) {
            log.warn("No kanji_details rows — skipping sentence import.");
            return new ImportResult(0, 0, 0);
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(resource.getInputStream());
        } catch (Exception e) {
            log.error("Failed to read sentence seed file: {}", e.getMessage());
            return new ImportResult(0, 0, 0);
        }

        Map<String, Integer> perKanji = new HashMap<>();
        int sentenceCount = 0, linkCount = 0, batch = 0;

        for (JsonNode node : root.path("sentences")) {
            String japanese = text(node, "japanese");
            if (japanese == null || japanese.isBlank()) continue;

            List<String> chars = KanjiVocabularyService.extractKanji(japanese).stream()
                    .filter(kanjiIdByChar::containsKey)
                    .filter(ch -> perKanji.getOrDefault(ch, 0) < MAX_PER_KANJI)
                    .toList();
            if (chars.isEmpty()) continue;

            List<FuriganaSegment> segments = furiganaService.segment(japanese);
            KanjiSentence sentence = em.merge(KanjiSentence.builder()
                    .japanese(japanese)
                    .segmentsJson(writeSegments(segments))
                    .translationEn(text(node, "en"))
                    .translationVi(text(node, "vi"))
                    .source(textOr(node, "source", "Tatoeba"))
                    .tatoebaId(longOrNull(node, "tatoebaId"))
                    .lengthChars(japanese.codePointCount(0, japanese.length()))
                    .build());
            sentenceCount++;

            for (String ch : chars) {
                em.persist(KanjiSentenceLink.builder()
                        .sentence(sentence)
                        .kanji(em.getReference(KanjiDetail.class, kanjiIdByChar.get(ch)))
                        .character(ch)
                        .build());
                perKanji.merge(ch, 1, Integer::sum);
                linkCount++;
            }

            if (++batch >= BATCH) {
                em.flush();
                em.clear();
                batch = 0;
            }
        }
        em.flush();

        log.info("Kanji sentence import complete: {} sentences, {} links across {} kanji.",
                sentenceCount, linkCount, perKanji.size());
        return new ImportResult(sentenceCount, linkCount, perKanji.size());
    }

    private Map<String, Long> loadKanjiIdMap() {
        Map<String, Long> map = new HashMap<>();
        List<Object[]> rows = em.createQuery(
                "SELECT k.character, k.id FROM KanjiDetail k WHERE k.isDeleted = false",
                Object[].class).getResultList();
        for (Object[] r : rows) {
            String ch = (String) r[0];
            if (ch != null) map.putIfAbsent(ch, (Long) r[1]);
        }
        return map;
    }

    private String writeSegments(List<FuriganaSegment> segments) {
        try {
            return objectMapper.writeValueAsString(segments);
        } catch (Exception e) {
            log.warn("Failed to serialize furigana segments: {}", e.getMessage());
            return null;
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asText();
    }

    private static String textOr(JsonNode node, String field, String fallback) {
        String v = text(node, field);
        return (v == null || v.isBlank()) ? fallback : v;
    }

    private static Long longOrNull(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asLong();
    }
}
