package com.example.starter_project_2025.domain.library.quizlet.session_item;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class QuizletSessionItemFilter extends BaseFilter {

    @FilterField(entityField = "session.id")
    Long sessionId;

    @FilterField(entityField = "deckItem.id")
    Long deckItemId;

    @FilterField(entityField = "flashcard.id")
    Long flashcardId;

    @FilterField
    String status;

    @FilterField
    Boolean isCorrect;
}
