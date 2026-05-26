package com.example.starter_project_2025.domain.library.quizlet.card_progress;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class QuizletCardProgressFilter extends BaseFilter {

    @FilterField(entityField = "user.id")
    Long userId;

    @FilterField(entityField = "deck.id")
    Long deckId;

    @FilterField(entityField = "deckItem.id")
    Long deckItemId;

    @FilterField(entityField = "flashcard.id")
    Long flashcardId;

    @FilterField(operator = FilterOperator.LIKE)
    String status;
}
