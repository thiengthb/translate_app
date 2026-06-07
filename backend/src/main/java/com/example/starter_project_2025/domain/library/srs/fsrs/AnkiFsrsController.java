package com.example.starter_project_2025.domain.library.srs.fsrs;

import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FSRS power tools that sit outside the per-review study loop.
 *
 * <p>Currently exposes <b>reschedule</b>: rebuild a deck's FSRS schedule from
 * review-log history. Optimize (parameter fitting) and simulate (workload
 * projection) are intentionally not here yet — a correct optimizer needs a
 * verified gradient fit and is out of scope for this slice.
 */
@RestController
@RequestMapping("/api/anki/fsrs")
@RequiredArgsConstructor
@Tag(name = "AnkiFsrs", description = "FSRS maintenance tools (reschedule from review-log history)")
public class AnkiFsrsController {

    private final FsrsRescheduleService rescheduleService;

    /**
     * Recompute the deck's FSRS schedule from each card's review history.
     *
     * @param dryRun when true (default) returns a preview summary without saving;
     *               pass {@code false} to actually apply the new schedule.
     */
    @PostMapping("/reschedule/{deckId}")
    @PreAuthorize("hasAuthority('ANKI_SRS_PROGRESS_UPDATE')")
    public ResponseEntity<RescheduleResultDTO> reschedule(
            @PathVariable Long deckId,
            @RequestParam(name = "dryRun", defaultValue = "true") boolean dryRun,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        try {
            return ResponseEntity.ok(rescheduleService.reschedule(principal.getId(), deckId, dryRun));
        } catch (IllegalStateException notFsrs) {
            // Deck isn't on FSRS — nothing to reschedule.
            return ResponseEntity.badRequest().build();
        }
    }
}
