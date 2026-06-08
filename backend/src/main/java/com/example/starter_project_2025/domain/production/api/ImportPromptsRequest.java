package com.example.starter_project_2025.domain.production.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Bulk import of AI-generated practice prompts (produced offline in an external
 * chat AI) into the teacher-review queue. Each item lands as a pending
 * ({@code source = "GENERATED"}) scenario + reference + prompt-cache triple, so
 * it shows up at {@code /production/review} and only enters the shared pool once
 * a reviewer approves it.
 *
 * @param items the batch of prompts to import (keyed to a grammar point by {@code detectorKey})
 */
public record ImportPromptsRequest(
        @NotEmpty(message = "items must not be empty")
        @Valid
        List<Item> items) {

    /**
     * One importable prompt.
     *
     * @param detectorKey      stable seed key of the target grammar point (e.g. {@code "prod_n5_tai"})
     * @param situation        the learner-facing Vietnamese situation/prompt
     * @param l2Reference      the Japanese model answer (must use the target grammar)
     * @param register         speech register (optional; defaults to {@code "polite"})
     * @param l1PromptTemplate richer prompt template (optional; defaults to {@code situation})
     */
    public record Item(
            @NotBlank(message = "detectorKey is required")
            String detectorKey,
            @NotBlank(message = "situation is required")
            String situation,
            @NotBlank(message = "l2Reference is required")
            String l2Reference,
            String register,
            String l1PromptTemplate) {
    }
}
