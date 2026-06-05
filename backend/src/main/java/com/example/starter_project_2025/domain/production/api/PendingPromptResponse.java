package com.example.starter_project_2025.domain.production.api;

import java.time.LocalDateTime;

/**
 * One AI-generated prompt awaiting teacher review, shown in the approval queue.
 *
 * @param situation       the learner-facing Vietnamese prompt ({@code l1Prompt})
 * @param referenceAnswer the Japanese model answer that must use the target grammar
 */
public record PendingPromptResponse(
        Long promptId,
        Long subUseId,
        String subUseName,
        String jlptLevel,
        String situation,
        String referenceAnswer,
        String register,
        LocalDateTime createdAt) {
}
