package com.example.starter_project_2025.domain.production.seed;

import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarkerRepository;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Idempotent, library-sourced backfill of {@link GrammarSubUse#getStructurePattern()
 * structurePattern} — the "Cấu trúc" line on the grammar detail screen, which no
 * seeder populates (so every point shows "Chưa có dữ liệu" until filled).
 *
 * <p>Source: {@code seed/jlpt_grammar.json}, an MIT-licensed JLPT grammar dictionary
 * (fluent-jp, repackaging aiko-tanaka/Grammar-Dictionaries). Each entry's
 * {@code connection} (e.g. {@code "Vマス + ながら"}) — or {@code pattern} as a fallback —
 * is matched to an existing usage by its normalised Japanese surface form.
 *
 * <p><b>Safe by construction:</b> only fills rows whose structurePattern is blank
 * (re-runs are no-ops), only matches on EXACT normalised form (no fuzzy merge), and
 * never creates or deletes rows. Unmatched usages are left untouched and logged so
 * coverage can be reviewed. New grammar points + example import are out of scope here.
 */
@Slf4j
@Component
@Order(210) // after the grammar seeders (101) and the parent-expression backfill (200)
@RequiredArgsConstructor
public class GrammarStructurePatternImporter implements CommandLineRunner {

    private static final String RESOURCE = "seed/jlpt_grammar.json";

    private final GrammarSubUseRepository subUseRepository;
    private final GrammarMarkerRepository markerRepository;
    private final ObjectMapper objectMapper;

    /** Pulls the Japanese form out of a usage name like {@code "Dự định (～つもり)"}. */
    private static final Pattern NAME_FORM = Pattern.compile("[（(]([^（()）]+)[)）]");

    @Override
    @Transactional
    public void run(String... args) {
        // Only worth scanning if some usage is actually missing its structure line.
        List<GrammarSubUse> all = subUseRepository.findAll();
        List<GrammarSubUse> blanks = all.stream()
                .filter(su -> isBlank(su.getStructurePattern()))
                .toList();
        if (blanks.isEmpty()) {
            return;
        }

        Map<String, String> formToStructure = loadStructureByForm();
        if (formToStructure.isEmpty()) {
            log.warn("Grammar structure import: no data loaded from {}, skipping", RESOURCE);
            return;
        }

        int filled = 0;
        List<String> unmatched = new ArrayList<>();
        for (GrammarSubUse su : blanks) {
            String structure = lookup(su, formToStructure);
            if (structure == null) {
                unmatched.add(su.getName());
                continue;
            }
            su.setStructurePattern(structure);
            subUseRepository.save(su);
            filled++;
        }

        log.info("Grammar structure import: filled {} / {} blank usage(s); {} unmatched",
                filled, blanks.size(), unmatched.size());
        if (!unmatched.isEmpty()) {
            log.info("Grammar structure import: unmatched (need manual/AI fill): {}", unmatched);
        }
    }

    /** First candidate form of this usage (markers + name) that the dataset knows. */
    private String lookup(GrammarSubUse su, Map<String, String> formToStructure) {
        for (String form : candidateForms(su)) {
            String hit = formToStructure.get(form);
            if (hit != null) {
                return hit;
            }
        }
        return null;
    }

    /** Normalised Japanese forms identifying a usage: its marker patterns + name form. */
    private List<String> candidateForms(GrammarSubUse su) {
        List<String> forms = new ArrayList<>();
        for (GrammarMarker m : markerRepository.findBySubUseId(su.getId())) {
            forms.addAll(expand(m.getMarkerPattern()));
        }
        Matcher mt = NAME_FORM.matcher(su.getName() == null ? "" : su.getName());
        while (mt.find()) {
            forms.addAll(expand(mt.group(1)));
        }
        return forms;
    }

    /**
     * Expand one raw form into comparison keys: drop Vietnamese parentheticals like
     * {@code "(sai khiến)"}, then split compound forms on {@code ／ / 、} (e.g.
     * {@code "～やすい／にくい"} → {@code ["やすい","にくい"]}), normalising each piece.
     */
    private static List<String> expand(String raw) {
        List<String> out = new ArrayList<>();
        if (raw == null) return out;
        String base = raw.replaceAll("[（(][^）)]*[)）]", "");
        for (String piece : base.split("[／/、]")) {
            String n = normalize(piece);
            if (!n.isEmpty()) out.add(n);
        }
        return out;
    }

    /** Build {normalised form → structure string} from the dataset (term & pattern keys). */
    private Map<String, String> loadStructureByForm() {
        Map<String, String> map = new LinkedHashMap<>();
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            JsonNode byLevel = objectMapper.readTree(in).path("by_level");
            for (JsonNode level : byLevel) {
                for (JsonNode e : level) {
                    String structure = clean(text(e, "connection"));
                    if (structure.isEmpty()) structure = clean(text(e, "pattern"));
                    if (structure.isEmpty()) continue;
                    // Key by both the bare term and the display pattern, first write wins.
                    for (String k : expand(text(e, "term"))) map.putIfAbsent(k, structure);
                    for (String k : expand(text(e, "pattern"))) map.putIfAbsent(k, structure);
                }
            }
            map.remove(""); // never match on an empty key
        } catch (Exception ex) {
            log.warn("Grammar structure import: failed to read {}: {}", RESOURCE, ex.getMessage());
        }
        return map;
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).asText("");
    }

    /** Tidy a structure string for display: drop the leading "・" bullet + outer spaces. */
    private static String clean(String s) {
        if (s == null) return "";
        return s.replace("・", "").trim();
    }

    /** Fold a Japanese form to a comparison key: strip tilde / spaces / trailing politeness. */
    private static String normalize(String s) {
        if (s == null) return "";
        return s.replaceAll("[（(][^）)]*[)）]", "")
                .replace("～", "").replace("〜", "").replace("・", "")
                .replaceAll("\\s", "")
                .replaceAll("です。?$", "")
                .replaceAll("。$", "")
                .trim();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
