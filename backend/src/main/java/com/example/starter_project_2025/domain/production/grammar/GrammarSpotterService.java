package com.example.starter_project_2025.domain.production.grammar;

import com.atilika.kuromoji.ipadic.Tokenizer;
import com.example.starter_project_2025.domain.production.detector.DetectorSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import java.util.stream.Collectors;

/**
 * Deterministic JLPT grammar detector for the translate page ("Grammar Spotter").
 *
 * Scans a Japanese sentence against the seeded {@link GrammarSubUse} +
 * {@link GrammarMarker} dictionary, reusing the Kuromoji {@link Tokenizer} and
 * {@link DetectorSupport}. Each marker matches either by a regex stored in
 * {@code detectorSubkey} (preferred, precise) or, failing that, by a plain
 * substring derived from {@code markerPattern}.
 *
 * Offline and reliable — the LLM layer ({@code OllamaClient.spotGrammar}) only
 * <em>supplements</em> these hits with patterns outside the dictionary.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GrammarSpotterService {

    private final Tokenizer tokenizer;
    private final GrammarSubUseRepository subUseRepository;
    private final GrammarMarkerRepository markerRepository;

    /** A grammar pattern found in the sentence. */
    public record GrammarHit(String pattern, String level, String meaning, String matchedText, String source) {}

    private static final Map<String, Integer> LEVEL_ORDER =
            Map.of("N5", 5, "N4", 4, "N3", 3, "N2", 2, "N1", 1);

    @Transactional(readOnly = true)
    public List<GrammarHit> spot(String japaneseText) {
        if (japaneseText == null || japaneseText.isBlank()) {
            return List.of();
        }
        String surface = DetectorSupport.joinSurfaces(tokenizer.tokenize(japaneseText));

        Map<Long, List<GrammarMarker>> markersBySub = markerRepository.findAll().stream()
                .filter(m -> m.getSubUse() != null)
                .collect(Collectors.groupingBy(m -> m.getSubUse().getId()));

        List<GrammarHit> hits = new ArrayList<>();
        for (GrammarSubUse su : subUseRepository.findAll()) {
            String matchedPattern = firstMatch(surface, markersBySub.get(su.getId()));
            if (matchedPattern != null) {
                hits.add(new GrammarHit(
                        matchedPattern,
                        su.getJlptLevel(),
                        su.getNuanceDescription(),
                        matchedPattern,
                        "dictionary"));
            }
        }

        // easiest level first (N5 → N1) for a stable, learner-friendly order
        hits.sort(Comparator.comparingInt(h -> -LEVEL_ORDER.getOrDefault(h.level(), 0)));
        return hits;
    }

    /** Return the display pattern of the first marker that matches, or null. */
    private String firstMatch(String surface, List<GrammarMarker> markers) {
        if (markers == null) {
            return null;
        }
        for (GrammarMarker m : markers) {
            String regex = m.getDetectorSubkey();
            if (regex != null && !regex.isBlank()) {
                try {
                    if (Pattern.compile(regex).matcher(surface).find()) {
                        return display(m);
                    }
                    continue;
                } catch (PatternSyntaxException e) {
                    log.warn("Bad grammar regex '{}' on marker {}", regex, m.getId());
                    // fall through to substring matching
                }
            }
            String needle = stripPattern(m.getMarkerPattern());
            if (!needle.isEmpty() && surface.contains(needle)) {
                return display(m);
            }
        }
        return null;
    }

    private String display(GrammarMarker m) {
        return m.getMarkerPattern() != null ? m.getMarkerPattern() : "";
    }

    private String stripPattern(String pattern) {
        if (pattern == null) {
            return "";
        }
        return pattern.replace("～", "").replace("~", "").replace("*", "").trim();
    }
}
