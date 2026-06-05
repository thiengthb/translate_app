package com.example.starter_project_2025.domain.production.api;

import java.util.List;

/**
 * Outcome of a bulk prompt import.
 *
 * @param imported    number of new pending prompts created
 * @param skipped     items skipped (duplicate {@code l2Reference} or unknown {@code detectorKey})
 * @param unknownKeys distinct {@code detectorKey} values that did not match any grammar point
 */
public record ImportPromptsResponse(
        int imported,
        int skipped,
        List<String> unknownKeys) {
}
