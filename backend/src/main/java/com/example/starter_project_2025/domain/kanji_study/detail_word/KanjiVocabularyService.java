package com.example.starter_project_2025.domain.kanji_study.detail_word;

import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetailRepository;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word.WordRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Read + maintenance logic for the kanji ↔ vocabulary link ({@link KanjiDetailWord}).
 *
 * <ul>
 *   <li>{@link #kanjiWords} — paginated vocabulary ("Từ vựng" / "Từ được đề cử").</li>
 *   <li>{@link #readingExamples} — vocabulary grouped by reading ("Ví dụ phát âm").</li>
 *   <li>{@link #relinkAllMissing} — backfill links for words that have none.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiVocabularyService {

    KanjiDetailWordRepository linkRepository;
    KanjiDetailRepository kanjiDetailRepository;
    WordRepository wordRepository;

    @NonFinal
    @PersistenceContext
    EntityManager em;

    // ── Read: "Từ vựng" (paginated) ─────────────────────────────────────

    public KanjiWordPage kanjiWords(String character, int page, int size) {
        Page<KanjiDetailWord> result = linkRepository
                .pageByCharacter(character, PageRequest.of(page, size));
        return KanjiWordPage.builder()
                .items(result.getContent().stream().map(kdw -> toVocabWord(kdw.getWord())).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    // ── Read: "Ví dụ phát âm" (grouped by reading) ──────────────────────

    public List<KanjiReadingGroup> readingExamples(String character, int maxWords, int samplesPerReading) {
        KanjiDetail kanji = kanjiDetailRepository.findByCharacter(character).orElse(null);
        if (kanji == null) return List.of();

        // Reading keys in declared order (ON then KUN) — drives output ordering.
        List<ReadingKey> declared = new ArrayList<>();
        for (String tok : splitReadings(kanji.getOnyomi())) {
            String stem = readingStem(tok);
            if (!stem.isBlank()) declared.add(new ReadingKey(tok.trim(), "ON", stem));
        }
        for (String tok : splitReadings(kanji.getKunyomi())) {
            String stem = readingStem(tok);
            if (!stem.isBlank()) declared.add(new ReadingKey(tok.trim(), "KUN", stem));
        }

        // Match order: longest stem first so a more specific reading wins.
        List<ReadingKey> byLength = new ArrayList<>(declared);
        byLength.sort((a, b) -> Integer.compare(b.stem().length(), a.stem().length()));

        List<KanjiDetailWord> links = linkRepository
                .findByCharacterWithWords(character, PageRequest.of(0, Math.max(1, maxWords)));

        LinkedHashMap<String, List<Word>> buckets = new LinkedHashMap<>();
        Map<String, ReadingKey> keyByDisplay = new HashMap<>();
        for (ReadingKey k : declared) {
            buckets.putIfAbsent(k.display(), new ArrayList<>());
            keyByDisplay.putIfAbsent(k.display(), k);
        }

        List<Word> others = new ArrayList<>();
        for (KanjiDetailWord link : links) {
            Word w = link.getWord();
            String wr = kataToHira(w.getReading());
            ReadingKey matched = null;
            for (ReadingKey k : byLength) {
                if (!wr.isBlank() && wr.contains(k.stem())) { matched = k; break; }
            }
            if (matched != null) buckets.get(matched.display()).add(w);
            else others.add(w);
        }

        int cap = Math.max(1, samplesPerReading);
        List<KanjiReadingGroup> out = new ArrayList<>();
        for (Map.Entry<String, List<Word>> e : buckets.entrySet()) {
            List<Word> ws = e.getValue();
            if (ws.isEmpty()) continue;
            out.add(KanjiReadingGroup.builder()
                    .reading(e.getKey())
                    .readingType(keyByDisplay.get(e.getKey()).type())
                    .totalCount(ws.size())
                    .words(ws.stream().limit(cap).map(this::toVocabWord).toList())
                    .build());
        }
        if (!others.isEmpty()) {
            out.add(KanjiReadingGroup.builder()
                    .readingType("OTHER")
                    .totalCount(others.size())
                    .words(others.stream().limit(cap).map(this::toVocabWord).toList())
                    .build());
        }
        return out;
    }

    // ── Maintenance: backfill links ─────────────────────────────────────

    /** Flush + clear every this-many inserts so a bulk relink doesn't bloat the persistence context. */
    private static final int LINK_BATCH = 2000;

    /**
     * Link every active word that currently has no {@link KanjiDetailWord} rows.
     * Idempotent — words that already have links are skipped, so it is safe to
     * run on every boot and on demand after seeding. Returns links created.
     *
     * <p>Scales to a full JMdict import (~200k words / ~hundreds of k links):
     * works off id/text projections and {@code getReference} (no full entities),
     * flushing + clearing every {@link #LINK_BATCH} inserts.</p>
     */
    @Transactional
    public int relinkAllMissing() {
        Map<String, Long> kanjiIdByChar = loadKanjiIdMap();
        if (kanjiIdByChar.isEmpty()) return 0;

        Set<Long> linked = new HashSet<>(linkRepository.findDistinctLinkedWordIds());

        List<Object[]> rows = em.createQuery(
                "SELECT w.id, w.word FROM Word w WHERE w.isDeleted = false AND w.isActive = true",
                Object[].class).getResultList();

        int total = 0, batch = 0;
        for (Object[] row : rows) {
            Long wid = (Long) row[0];
            String text = (String) row[1];
            if (wid == null || text == null || linked.contains(wid)) continue;
            linked.add(wid);

            Set<String> done = new HashSet<>();
            Word wref = null;
            for (String ch : extractKanji(text)) {
                if (!done.add(ch)) continue;
                Long kid = kanjiIdByChar.get(ch);
                if (kid == null) continue;
                if (wref == null) wref = em.getReference(Word.class, wid);
                em.persist(KanjiDetailWord.builder()
                        .word(wref)
                        .kanji(em.getReference(KanjiDetail.class, kid))
                        .character(ch)
                        .build());
                total++;
                if (++batch >= LINK_BATCH) {
                    em.flush();
                    em.clear();
                    batch = 0;
                    wref = null; // detached after clear — re-fetch next use
                }
            }
        }
        if (batch > 0) {
            em.flush();
            em.clear();
        }
        return total;
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

    // ── Mapping ─────────────────────────────────────────────────────────

    private KanjiVocabWord toVocabWord(Word w) {
        return KanjiVocabWord.builder()
                .id(w.getId())
                .word(w.getWord())
                .reading(w.getReading())
                .wordType(w.getWordType())
                .frequency(w.getFrequency())
                .meaningText(primaryMeaningText(w))
                .levelCode(w.getLevel() != null ? w.getLevel().getCode() : null)
                .levelName(w.getLevel() != null ? w.getLevel().getName() : null)
                .build();
    }

    /** Display meaning: Vietnamese first, else the first available. */
    private static String primaryMeaningText(Word word) {
        List<Meaning> meanings = word.getMeanings();
        if (meanings == null || meanings.isEmpty()) return null;
        return meanings.stream()
                .filter(KanjiVocabularyService::isVietnamese)
                .map(Meaning::getName)
                .findFirst()
                .orElse(meanings.get(0).getName());
    }

    private static boolean isVietnamese(Meaning m) {
        String code = m.getLanguage() != null ? m.getLanguage().getCode() : null;
        return code != null && ("vi".equalsIgnoreCase(code) || "vie".equalsIgnoreCase(code));
    }

    // ── Reading / kanji helpers ─────────────────────────────────────────

    /** A kanji reading: display form (e.g. "サン"), ON/KUN tag, hiragana stem for matching. */
    private record ReadingKey(String display, String type, String stem) {}

    private static final Pattern READING_SPLIT = Pattern.compile("[、,，/・\\s]+");

    /** Distinct CJK ideographs in {@code text}, first-seen order (handles surrogate pairs). */
    public static List<String> extractKanji(String text) {
        if (text == null || text.isEmpty()) return List.of();
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        int i = 0;
        while (i < text.length()) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            if (Character.UnicodeBlock.of(cp) == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS) {
                seen.add(new String(Character.toChars(cp)));
            }
        }
        return new ArrayList<>(seen);
    }

    private static List<String> splitReadings(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(READING_SPLIT.split(s.trim()))
                .filter(t -> !t.isBlank())
                .toList();
    }

    /** Matching stem: okurigana / inflection markers stripped, katakana→hiragana. */
    private static String readingStem(String token) {
        if (token == null) return "";
        String t = token.trim();
        int cut = t.length();
        for (String sep : new String[]{".", "-", "(", "（", "~", "～", "・"}) {
            int idx = t.indexOf(sep);
            if (idx >= 0) cut = Math.min(cut, idx);
        }
        return kataToHira(t.substring(0, cut)).trim();
    }

    /** Fold katakana to hiragana so on-yomi (カタカナ) and word kana readings compare equal. */
    private static String kataToHira(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            if (c >= 0x30A1 && c <= 0x30F6) sb.append((char) (c - 0x60));
            else sb.append(c);
        }
        return sb.toString();
    }
}
