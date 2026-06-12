package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import com.example.starter_project_2025.domain.production.llm.DeepSeekClient;
import com.example.starter_project_2025.domain.production.llm.GeminiClient;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Fills missing Vietnamese translations on {@link KanjiSentence} rows by
 * machine-translating the (English-glossed) Japanese via {@link GeminiClient}.
 *
 * <p>Tatoeba's JA→VI coverage is sparse, so most seeded sentences arrive with
 * {@code translationVi == null} and render in English. This batches over those
 * rows and back-fills Vietnamese. It is <b>resumable</b> (only touches null-VI
 * rows, walks forward by id) and <b>bounded</b> per call ({@code limit}) so it
 * can be run in chunks that respect Gemini rate limits — re-run until
 * {@code remaining == 0}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KanjiSentenceTranslationService {

    private final GeminiClient geminiClient;
    private final DeepSeekClient deepSeekClient;

    @PersistenceContext
    private EntityManager em;

    /**
     * Translate up to {@code limit} sentences (in groups of {@code batchSize})
     * that have an English translation but no Vietnamese one. Returns
     * {@code translated} (rows updated), {@code processed} (rows attempted), and
     * {@code remaining} (null-VI rows still left).
     */
    @Transactional
    public Map<String, Object> translateMissingVi(int limit, int batchSize) {
        Map<String, Object> result = new LinkedHashMap<>();
        // DeepSeek first when configured: pay-per-token with no hard rate limits,
        // unlike Gemini's free tier (~20 requests/day/model).
        boolean useDeepSeek = deepSeekClient.isAvailable();
        if (!useDeepSeek && !geminiClient.isAvailable()) {
            result.put("error", "Neither DEEPSEEK_API_KEY nor GEMINI_API_KEY configured");
            result.put("translated", 0);
            result.put("remaining", countRemaining());
            return result;
        }
        result.put("provider", useDeepSeek ? "deepseek" : "gemini");

        int translated = 0, processed = 0;
        long cursor = 0;
        boolean stopped = false;

        while (processed < limit) {
            int take = Math.min(batchSize, limit - processed);
            List<KanjiSentence> rows = em.createQuery("""
                    SELECT s FROM KanjiSentence s
                    WHERE s.id > :cursor
                    AND s.translationVi IS NULL
                    AND s.translationEn IS NOT NULL
                    AND s.isDeleted = false
                    ORDER BY s.id
                    """, KanjiSentence.class)
                    .setParameter("cursor", cursor)
                    .setMaxResults(take)
                    .getResultList();
            if (rows.isEmpty()) break;
            cursor = rows.get(rows.size() - 1).getId();

            List<String> ja = rows.stream().map(KanjiSentence::getJapanese).toList();
            List<String> en = rows.stream().map(KanjiSentence::getTranslationEn).toList();

            List<String> vi = useDeepSeek
                    ? deepSeekClient.translateToVietnamese(ja, en)
                    : geminiClient.translateToVietnamese(ja, en);
            processed += rows.size();
            if (vi == null) {
                // Whole-batch failure (no key / network / parse / count mismatch) — stop cleanly.
                stopped = true;
                break;
            }
            for (int i = 0; i < rows.size(); i++) {
                String v = vi.get(i);
                if (v != null && !v.isBlank()) {
                    rows.get(i).setTranslationVi(v.trim());
                    translated++;
                }
            }
            em.flush();
            em.clear();
        }

        result.put("translated", translated);
        result.put("processed", processed);
        result.put("remaining", countRemaining());
        if (stopped) result.put("stopped", "batch translation failed; safe to re-run");
        log.info("Kanji VI translate: translated={}, processed={}, remaining={}",
                translated, processed, result.get("remaining"));
        return result;
    }

    private long countRemaining() {
        return em.createQuery("""
                SELECT count(s) FROM KanjiSentence s
                WHERE s.translationVi IS NULL
                AND s.translationEn IS NOT NULL
                AND s.isDeleted = false
                """, Long.class).getSingleResult();
    }
}
