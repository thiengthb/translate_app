package com.example.starter_project_2025.system.translate;

import com.example.starter_project_2025.domain.production.grammar.GrammarSpotterService;
import com.example.starter_project_2025.domain.production.grammar.GrammarSpotterService.GrammarHit;
import com.example.starter_project_2025.domain.production.llm.OllamaClient;
import com.example.starter_project_2025.system.analyze.RomajiService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds the translate-page analysis: romaji (MeCab, deterministic),
 * alternative translations (Ollama), and JLPT Grammar Spotter results
 * (fully deterministic dictionary — no Ollama at grammar-scan runtime).
 *
 * <p>Grammar scanning uses the pre-built Aho-Corasick + compiled-Pattern index
 * in {@link GrammarSpotterService}: O(sentence_length) with zero DB calls after
 * the first warm-up. Romaji + grammar only apply to Japanese targets. The Ollama
 * step (alternatives) degrades gracefully to an empty list when the model is
 * unavailable.
 */
@Service
@RequiredArgsConstructor
public class TranslationAnalysisService {

    private final RomajiService romajiService;
    private final GrammarSpotterService grammarSpotter;
    private final OllamaClient ollamaClient;

    private static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "JA", "Japanese", "EN", "English", "VI", "Vietnamese",
            "ZH", "Chinese", "KO", "Korean", "FR", "French", "DE", "German");

    public TranslateAnalysisResponse analyze(TranslateAnalysisRequest req) {
        String target = req.targetLang() == null ? "" : req.targetLang();
        String translated = req.translatedText() == null ? "" : req.translatedText().trim();
        boolean japanese = target.toUpperCase(Locale.ROOT).startsWith("JA");

        List<AlternativeDTO> alternatives = buildAlternatives(req.text(), translated, target, japanese);

        if (!japanese || translated.isBlank()) {
            return new TranslateAnalysisResponse(null, alternatives, List.of());
        }

        String romaji = romajiService.toRomaji(translated);
        List<GrammarPointDTO> grammar = buildGrammar(translated);
        return new TranslateAnalysisResponse(romaji, alternatives, grammar);
    }

    private List<AlternativeDTO> buildAlternatives(String source, String translated, String target, boolean japanese) {
        List<AlternativeDTO> alternatives = new ArrayList<>();
        if (translated.isBlank()) {
            return alternatives;
        }
        for (String alt : ollamaClient.alternatives(source, translated, languageName(target))) {
            alternatives.add(new AlternativeDTO(alt, japanese ? romajiService.toRomaji(alt) : null));
        }
        return alternatives;
    }

    private List<GrammarPointDTO> buildGrammar(String japaneseText) {
        // Fully deterministic: Aho-Corasick + compiled-Pattern index (no Ollama at runtime).
        // The index is pre-built from the JLPT dictionary seeded by GrammarDictionarySeeder.
        return grammarSpotter.spot(japaneseText).stream()
                .map(h -> new GrammarPointDTO(h.pattern(), h.level(), h.meaning(), h.matchedText(), h.source()))
                .toList();
    }

    private String languageName(String code) {
        if (code == null || code.isBlank()) {
            return "the target language";
        }
        String base = code.split("-")[0].toUpperCase(Locale.ROOT);
        return LANGUAGE_NAMES.getOrDefault(base, code);
    }
}
