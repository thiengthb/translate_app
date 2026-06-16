package com.example.starter_project_2025.domain.kanji_study.search;

import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetailDTO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Relevance-ranked kanji search for the "CHỮ HÁN" tab.
 *
 * <p>The old behaviour was a blunt {@code LIKE %q%} over character + meaning, so
 * "hell" matched <i>s<b>hell</b>fish</i> and readings were ignored entirely.
 * This searches three signals and ranks by how well each matches:</p>
 *
 * <ol>
 *   <li><b>character</b> — exact glyph;</li>
 *   <li><b>reading</b> — on/kun (katakana folded to hiragana) plus romaji typed on
 *       a Latin keyboard ("jigoku" → じごく), matched fuzzily so the kanji that
 *       <i>make up</i> a word surface (じごく → 地・獄 among other じ/ごく kanji);</li>
 *   <li><b>meaning</b> — English, matched at <b>word boundaries</b> so "hell" hits
 *       the meaning "hell" but never "shell".</li>
 * </ol>
 *
 * <p>~3k kanji are scanned in memory per query (a light projection) — trivial for
 * a debounced search box and far simpler than expressing this ranking in SQL.</p>
 */
@Service
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiSearchService {

    @PersistenceContext
    EntityManager em;

    private static final Pattern READING_SPLIT = Pattern.compile("[、,，/・\\s]+");
    private static final Pattern WORD_SPLIT = Pattern.compile("[^a-z0-9]+");

    /** A scored candidate (lower score = better match). */
    private record Scored(Row row, int score) {}

    private record Row(Long id, String character, String onyomi, String kunyomi,
                       String meaning, String jlptLevel) {}

    public Page<KanjiDetailDTO> search(String query, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        String qRaw = query == null ? "" : query.trim();
        if (qRaw.isEmpty()) return new PageImpl<>(List.of(), pageable, 0);

        String qLower = qRaw.toLowerCase();

        // Reading queries (hiragana): the typed kana itself, and/or romaji folded.
        LinkedHashSet<String> readingQueries = new LinkedHashSet<>();
        String typedKana = RomajiKana.kataToHira(qRaw);
        if (RomajiKana.hasKana(typedKana)) readingQueries.add(typedKana);
        if (RomajiKana.isRomaji(qRaw)) {
            String romaji = RomajiKana.toHiragana(qRaw);
            if (RomajiKana.hasKana(romaji)) readingQueries.add(romaji);
        }
        String qNoDiac = RomajiKana.stripDiacritics(qLower);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery("""
                SELECT k.id, k.character, k.onyomi, k.kunyomi, k.meaning, k.jlptLevel
                FROM KanjiDetail k
                WHERE k.isDeleted = false
                """).getResultList();

        Map<Long, List<String>> hanVietByKanji = qNoDiac.isBlank() ? Map.of() : loadHanViet();

        List<Scored> matches = new ArrayList<>();
        for (Object[] r : rows) {
            Row row = new Row((Long) r[0], (String) r[1], (String) r[2],
                    (String) r[3], (String) r[4], (String) r[5]);
            int score = scoreKanji(row, qRaw, qLower, qNoDiac, readingQueries,
                    hanVietByKanji.getOrDefault(row.id(), List.of()));
            if (score < Integer.MAX_VALUE) matches.add(new Scored(row, score));
        }

        matches.sort(Comparator
                .comparingInt(Scored::score)
                .thenComparingInt(s -> jlptRank(s.row().jlptLevel()))
                .thenComparing(s -> s.row().character()));

        long total = matches.size();
        int from = (int) Math.min((long) pageable.getPageNumber() * pageable.getPageSize(), total);
        int to = (int) Math.min(from + pageable.getPageSize(), total);
        List<KanjiDetailDTO> content = matches.subList(from, to).stream()
                .map(s -> toDto(s.row())).toList();
        return new PageImpl<>(content, pageable, total);
    }

    /** The minimum (best) score across all signals, or MAX_VALUE if nothing matched. */
    private int scoreKanji(Row row, String qRaw, String qLower, String qNoDiac,
                           Set<String> readingQueries, List<String> hanViet) {
        int best = Integer.MAX_VALUE;

        // 1) exact character
        if (qRaw.equals(row.character())) best = 0;

        // 2) reading (on/kun), fuzzy
        if (best > 1 && !readingQueries.isEmpty()) {
            List<String> stems = new ArrayList<>();
            collectStems(row.onyomi(), stems);
            collectStems(row.kunyomi(), stems);
            for (String rq : readingQueries) {
                if (rq.isBlank()) continue;
                for (String stem : stems) {
                    if (stem.isBlank()) continue;
                    if (stem.equals(rq)) best = Math.min(best, 1);
                    else if (rq.startsWith(stem) || stem.startsWith(rq)) best = Math.min(best, 2);
                    else if (stem.length() >= 2 && (rq.endsWith(stem) || stem.contains(rq) || rq.contains(stem)))
                        best = Math.min(best, 3);
                }
            }
        }

        // 3) meaning (English), word-boundary only — "hell" must not match "shell"
        if (best > 1 && row.meaning() != null) {
            String m = row.meaning().toLowerCase();
            if (qLower.contains(" ")) {
                if (m.contains(qLower)) best = Math.min(best, 2); // phrase
            } else {
                String[] words = WORD_SPLIT.split(m);
                for (String w : words) {
                    if (w.isBlank()) continue;
                    if (w.equals(qLower)) { best = Math.min(best, 1); break; }
                    if (w.startsWith(qLower)) best = Math.min(best, 2);
                }
            }
        }

        // 4) Hán-Việt reading, diacritic-insensitive (bonus)
        if (best > 2 && !hanViet.isEmpty() && !qNoDiac.isBlank()) {
            for (String hv : hanViet) {
                String h = RomajiKana.stripDiacritics(hv.toLowerCase());
                if (h.equals(qNoDiac)) { best = Math.min(best, 2); break; }
                if (qNoDiac.length() >= 2 && h.startsWith(qNoDiac)) best = Math.min(best, 3);
            }
        }

        return best;
    }

    /** Reading tokens reduced to their hiragana matching stem (okurigana stripped). */
    private static void collectStems(String readings, List<String> out) {
        if (readings == null || readings.isBlank()) return;
        for (String tok : READING_SPLIT.split(readings.trim())) {
            if (tok.isBlank()) continue;
            String t = tok.trim();
            int cut = t.length();
            for (String sep : new String[]{".", "-", "(", "（", "~", "～", "・"}) {
                int idx = t.indexOf(sep);
                if (idx >= 0) cut = Math.min(cut, idx);
            }
            String stem = RomajiKana.kataToHira(t.substring(0, cut)).trim();
            if (!stem.isBlank()) out.add(stem);
        }
    }

    private Map<Long, List<String>> loadHanViet() {
        Map<Long, List<String>> map = new HashMap<>();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery("""
                SELECT r.kanji.id, r.value FROM KanjiReading r
                WHERE r.readingType = 'HAN_VIET' AND r.isDeleted = false
                ORDER BY r.priority ASC
                """).getResultList();
        for (Object[] r : rows) {
            Long kid = (Long) r[0];
            String v = (String) r[1];
            if (kid != null && v != null && !v.isBlank()) {
                map.computeIfAbsent(kid, k -> new ArrayList<>()).add(v);
            }
        }
        return map;
    }

    private static int jlptRank(String level) {
        if (level == null) return 9;
        return switch (level.toUpperCase()) {
            case "N5" -> 0;
            case "N4" -> 1;
            case "N3" -> 2;
            case "N2" -> 3;
            case "N1" -> 4;
            default -> 8;
        };
    }

    private static KanjiDetailDTO toDto(Row row) {
        KanjiDetailDTO dto = KanjiDetailDTO.builder()
                .character(row.character())
                .onyomi(row.onyomi())
                .kunyomi(row.kunyomi())
                .meaning(row.meaning())
                .jlptLevel(row.jlptLevel())
                .build();
        dto.setId(row.id());
        return dto;
    }
}
