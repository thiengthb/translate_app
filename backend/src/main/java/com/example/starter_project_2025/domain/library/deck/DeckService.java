package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.service.BaseCrudService;

public interface DeckService extends BaseCrudService<Long, DeckDTO, DeckFilter> {

    /** Set deck.templateId to the given template (template must exist). */
    DeckDTO applyTemplate(Long deckId, Long templateId);

    /** Clear deck.templateId, falling back to the system default at render time. */
    DeckDTO removeTemplate(Long deckId);

    /**
     * Deep-clone a deck (and all its flashcards + sides + contents) into the current user's
     * library. The source deck must be PUBLIC unless it already belongs to the current user.
     * The clone is created as PRIVATE; templateId is preserved (templates are shared globally).
     */
    DeckDTO cloneDeck(Long deckId);

    /** Increment the deck's view counter (called when the preview page is opened). */
    void incrementView(Long deckId);
}
