package com.example.starter_project_2025.domain.library.flashcard;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/flashcards")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Flashcard", description = "APIs for managing flashcards")
public class FlashcardController {

    FlashcardService flashcardService;
    FlashcardRenderService flashcardRenderService;

    /* ─────────────────────────────────────────
       Content sub-resource endpoints
    ───────────────────────────────────────── */

    @PostMapping("/{id}/sides/{sideId}/contents")
    public ResponseEntity<FlashcardDTO.ContentDTO> addContent(
            @PathVariable Long id,
            @PathVariable Long sideId,
            @Valid @RequestBody FlashcardDTO.ContentDTO request
    ) {
        return ResponseEntity.ok(flashcardService.addContent(sideId, request));
    }

    @DeleteMapping("/{id}/sides/{sideId}/contents/{contentId}")
    public ResponseEntity<Void> removeContent(
            @PathVariable Long id,
            @PathVariable Long sideId,
            @PathVariable Long contentId
    ) {
        flashcardService.removeContent(contentId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/sides/{sideId}/contents/reorder")
    public ResponseEntity<Void> reorderContents(
            @PathVariable Long id,
            @PathVariable Long sideId,
            @RequestBody List<Long> orderedContentIds
    ) {
        flashcardService.reorderContents(sideId, orderedContentIds);
        return ResponseEntity.noContent().build();
    }

    /* ─────────────────────────────────────────
       Render endpoint — returns HTML built from the deck's template
       (or the system default for the card's cardType).
    ───────────────────────────────────────── */

    @GetMapping("/{id}/render")
    public ResponseEntity<FlashcardRenderDTO> render(@PathVariable Long id) {
        return ResponseEntity.ok(flashcardRenderService.renderCard(id));
    }
}
