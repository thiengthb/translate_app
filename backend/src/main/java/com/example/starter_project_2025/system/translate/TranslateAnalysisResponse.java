package com.example.starter_project_2025.system.translate;

import java.util.List;

/**
 * Result of {@code POST /api/translate/analyze}: romaji of the main translation,
 * alternative translations, and the JLPT grammar patterns spotted in the sentence.
 * {@code romaji} is null and {@code grammar} empty for non-Japanese targets.
 */
public record TranslateAnalysisResponse(
        String romaji,
        List<AlternativeDTO> alternatives,
        List<GrammarPointDTO> grammar
) {
}
