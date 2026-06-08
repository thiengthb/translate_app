package com.example.starter_project_2025.system.translate;

import java.util.List;

/**
 * Result of {@code POST /api/translate/analyze/grammar}: the fast, fully
 * deterministic part of the analysis — Hepburn romaji (MeCab) plus the JLPT
 * grammar patterns spotted in the sentence (Aho-Corasick). No LLM involved,
 * so this returns in milliseconds. {@code romaji} is null and {@code grammar}
 * empty for non-Japanese targets.
 */
public record GrammarAnalysisResponse(
        String romaji,
        List<GrammarPointDTO> grammar
) {
}
