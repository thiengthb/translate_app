package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.Data;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/decks")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Deck", description = "APIs for managing study decks")
public class DeckController
        extends BaseCrudDataIoController<Deck, Long, DeckDTO, DeckFilter> {

    DeckService deckService;
    DeckRepository deckRepository;

    @Override
    protected BaseCrudService<Long, DeckDTO, DeckFilter> getService() {
        return deckService;
    }

    @Override
    protected BaseCrudRepository<Deck, Long> getRepository() {
        return deckRepository;
    }

    @Override
    protected Class<Deck> getEntityClass() {
        return Deck.class;
    }

    /* ─────────────────────────────────────────
       Template wiring: 1 template per deck
    ───────────────────────────────────────── */

    @PutMapping("/{deckId}/template")
    public ResponseEntity<DeckDTO> applyTemplate(
            @PathVariable Long deckId,
            @RequestBody ApplyTemplateRequest body
    ) {
        return ResponseEntity.ok(deckService.applyTemplate(deckId, body.getTemplateId()));
    }

    @DeleteMapping("/{deckId}/template")
    public ResponseEntity<DeckDTO> removeTemplate(@PathVariable Long deckId) {
        return ResponseEntity.ok(deckService.removeTemplate(deckId));
    }

    @Data
    public static class ApplyTemplateRequest {
        private Long templateId;
    }
}
