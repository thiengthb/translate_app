package com.example.starter_project_2025.system.translate;

import java.util.List;

/**
 * Result of {@code POST /api/translate/analyze/alternatives}: the slow part of
 * the analysis — alternative translations produced by the Ollama LLM (with
 * romaji per alternative when the target is Japanese). Degrades gracefully to
 * an empty list when the model is unavailable.
 */
public record AlternativesAnalysisResponse(
        List<AlternativeDTO> alternatives
) {
}
