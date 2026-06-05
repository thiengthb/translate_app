package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.system.analyze.SudachiTokenizer;
import com.example.starter_project_2025.domain.production.detector.DetectorSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ahocorasick.trie.Emit;
import org.ahocorasick.trie.Trie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Deterministic JLPT grammar detector for the translate-page "Grammar Spotter".
 *
 * <h2>Index design</h2>
 * On first use (lazily, thread-safe) or after {@link #invalidateIndex()} is called,
 * the service loads every {@link GrammarMarker} from the database and builds two
 * parallel search structures:
 * <ul>
 *   <li><b>Track A – Aho-Corasick trie</b>: for markers whose
 *       {@code detectorSubkey} is blank, the stripped {@code markerPattern} is
 *       inserted as a plain keyword. Scanning a sentence with the trie is
 *       O(sentence_length + number_of_hits) regardless of dictionary size.</li>
 *   <li><b>Track B – pre-compiled {@link Pattern} cache</b>: for markers that
 *       carry a Java regex in {@code detectorSubkey}, the pattern is compiled once
 *       and reused across all requests.</li>
 * </ul>
 *
 * <p>Both tracks are rebuilt only when the index is invalidated (e.g. after the
 * {@link GrammarDictionarySeeder} runs), so routine requests never touch the DB.
 *
 * <h2>No LLM at runtime</h2>
 * Grammar detection is fully deterministic and offline.  The LLM is used only
 * at seed-time to author the regex entries in the dictionary.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GrammarSpotterService {

    private final SudachiTokenizer tokenizer;
    private final GrammarSubUseRepository subUseRepository;
    private final GrammarMarkerRepository markerRepository;

    // ── public result type ───────────────────────────────────────────────────

    /** A grammar pattern found in the sentence. */
    public record GrammarHit(String pattern, String level, String meaning, String matchedText, String source) {}

    // ── JLPT ordering (N5 = easiest, shown first) ───────────────────────────

    private static final Map<String, Integer> LEVEL_ORDER =
            Map.of("N5", 5, "N4", 4, "N3", 3, "N2", 2, "N1", 1);

    // ── index ────────────────────────────────────────────────────────────────

    /**
     * Immutable snapshot of the compiled grammar index.
     *
     * @param trie               Aho-Corasick automaton (null when no plain-string markers exist)
     * @param keywordToSubUseIds maps AC keyword → set of subUse IDs (many markers may share a needle)
     * @param compiledPatterns   subUse ID → list of pre-compiled regex {@link Pattern}s
     * @param subUses            full subUse metadata keyed by ID
     */
    private record GrammarIndex(
            Trie trie,
            Map<String, Set<Long>> keywordToSubUseIds,
            Map<Long, List<Pattern>> compiledPatterns,
            Map<Long, GrammarSubUse> subUses) {}

    /** Volatile so reads without the lock see the latest reference after a rebuild. */
    private volatile GrammarIndex index;
    private final Object indexLock = new Object();

    /**
     * Invalidates the cached index.  Call this after the grammar dictionary is
     * modified (e.g. at the end of {@link GrammarDictionarySeeder#run}).
     * The index will be rebuilt lazily on the next {@link #spot} invocation.
     */
    public void invalidateIndex() {
        index = null;
        log.debug("Grammar Spotter index invalidated – will rebuild on next call");
    }

    private GrammarIndex getIndex() {
        GrammarIndex idx = index;          // one volatile read
        if (idx != null) return idx;
        synchronized (indexLock) {
            idx = index;
            if (idx != null) return idx;   // lost race
            idx = buildIndex();
            index = idx;
            log.info("Grammar Spotter index built: {} subUses, {} compiled patterns, {} AC keywords",
                    idx.subUses().size(),
                    idx.compiledPatterns().values().stream().mapToInt(List::size).sum(),
                    idx.keywordToSubUseIds().size());
        }
        return idx;
    }

    @Transactional(readOnly = true)
    protected GrammarIndex buildIndex() {
        // Load everything in two DB calls
        Map<Long, GrammarSubUse> subUseMap = new HashMap<>();
        for (GrammarSubUse su : subUseRepository.findAll()) {
            subUseMap.put(su.getId(), su);
        }

        Map<String, Set<Long>> keywordToSubUseIds = new HashMap<>();
        Map<Long, List<Pattern>> compiledPatterns = new HashMap<>();
        Trie.TrieBuilder trieBuilder = Trie.builder();
        boolean trieHasEntries = false;

        for (GrammarMarker m : markerRepository.findAll()) {
            if (m.getSubUse() == null) continue;
            long subUseId = m.getSubUse().getId();

            String regex = m.getDetectorSubkey();
            if (regex != null && !regex.isBlank()) {
                // Track B: compile regex once
                try {
                    Pattern p = Pattern.compile(regex);
                    compiledPatterns.computeIfAbsent(subUseId, k -> new ArrayList<>()).add(p);
                } catch (PatternSyntaxException e) {
                    log.warn("Grammar Spotter: invalid regex '{}' on marker {} – skipped: {}",
                            regex, m.getId(), e.getMessage());
                }
            } else {
                // Track A: plain substring → Aho-Corasick
                String needle = stripPattern(m.getMarkerPattern());
                if (!needle.isEmpty()) {
                    trieBuilder.addKeyword(needle);
                    keywordToSubUseIds.computeIfAbsent(needle, k -> new HashSet<>()).add(subUseId);
                    trieHasEntries = true;
                }
            }
        }

        Trie trie = trieHasEntries ? trieBuilder.build() : null;
        return new GrammarIndex(trie, keywordToSubUseIds, compiledPatterns, subUseMap);
    }

    // ── public API ───────────────────────────────────────────────────────────

    /**
     * Scans {@code japaneseText} against the cached grammar index and returns
     * every JLPT pattern found, ordered N5 → N1 (easiest level first).
     */
    public List<GrammarHit> spot(String japaneseText) {
        if (japaneseText == null || japaneseText.isBlank()) {
            return List.of();
        }

        // MeCab surface join (same approach as detectors in the production exercise)
        String surface = DetectorSupport.joinSurfaces(tokenizer.tokenize(japaneseText));

        GrammarIndex idx = getIndex();
        Set<Long> matchedIds = new HashSet<>();
        Map<Long, String> matchedTexts = new HashMap<>();

        // ── Track A: Aho-Corasick (O(n), plain-string markers) ──────────────
        if (idx.trie() != null) {
            for (Emit emit : idx.trie().parseText(surface)) {
                Set<Long> ids = idx.keywordToSubUseIds().get(emit.getKeyword());
                if (ids != null) {
                    for (Long id : ids) {
                        if (matchedIds.add(id)) {
                            matchedTexts.put(id, emit.getKeyword());
                        }
                    }
                }
            }
        }

        // ── Track B: pre-compiled regex patterns ────────────────────────────
        for (Map.Entry<Long, List<Pattern>> entry : idx.compiledPatterns().entrySet()) {
            Long subUseId = entry.getKey();
            if (matchedIds.contains(subUseId)) continue;  // already matched via AC
            for (Pattern p : entry.getValue()) {
                Matcher m = p.matcher(surface);
                if (m.find()) {
                    matchedIds.add(subUseId);
                    matchedTexts.put(subUseId, m.group());
                    break;  // one matching pattern per sub-use is enough
                }
            }
        }

        // ── Assemble GrammarHit list ─────────────────────────────────────────
        List<GrammarHit> hits = new ArrayList<>(matchedIds.size());
        for (Long subUseId : matchedIds) {
            GrammarSubUse su = idx.subUses().get(subUseId);
            if (su == null) continue;
            hits.add(new GrammarHit(
                    su.getName(),
                    su.getJlptLevel(),
                    su.getNuanceDescription(),
                    matchedTexts.getOrDefault(subUseId, ""),
                    "dictionary"));
        }

        // Easiest first (N5 → N4 → … → N1)
        hits.sort(Comparator.comparingInt(h -> -LEVEL_ORDER.getOrDefault(h.level(), 0)));
        return hits;
    }

    /**
     * Targeted check: does {@code japaneseText} contain any marker belonging to
     * the given sub-use?  Used by the production grader as a regex-backed
     * fallback when a sub-use has no hand-written Java {@code GrammarDetector},
     * so new grammar points can be added by data alone.
     */
    public boolean matchesSubUse(long subUseId, String japaneseText) {
        if (japaneseText == null || japaneseText.isBlank()) {
            return false;
        }
        String surface = DetectorSupport.joinSurfaces(tokenizer.tokenize(japaneseText));
        GrammarIndex idx = getIndex();

        // Track B: regex markers for this sub-use
        List<Pattern> patterns = idx.compiledPatterns().get(subUseId);
        if (patterns != null) {
            for (Pattern p : patterns) {
                if (p.matcher(surface).find()) {
                    return true;
                }
            }
        }
        // Track A: plain-string markers (look up which keywords map to this sub-use)
        for (Map.Entry<String, Set<Long>> e : idx.keywordToSubUseIds().entrySet()) {
            if (e.getValue().contains(subUseId) && surface.contains(e.getKey())) {
                return true;
            }
        }
        return false;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static String stripPattern(String pattern) {
        if (pattern == null) return "";
        return pattern.replace("～", "").replace("~", "").replace("*", "").trim();
    }
}
