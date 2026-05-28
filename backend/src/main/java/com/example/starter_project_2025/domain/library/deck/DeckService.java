package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.service.BaseCrudService;

public interface DeckService extends BaseCrudService<Long, DeckDTO, DeckFilter> {

    /** Set deck.templateId to the given template (template must exist). */
    DeckDTO applyTemplate(Long deckId, Long templateId);

    /** Clear deck.templateId, falling back to the system default at render time. */
    DeckDTO removeTemplate(Long deckId);
}
