package com.example.starter_project_2025.domain.library.deck_item;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class DeckItemFilter extends BaseFilter {

    @FilterField(entityField = "deck.id")
    Long deckId;

    @FilterField(entityField = "flashcard.id")
    Long flashcardId;
}
