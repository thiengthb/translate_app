package com.example.starter_project_2025.domain.library.quizlet.study_log;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class QuizletStudyLogFilter extends BaseFilter {

    @FilterField(entityField = "user.id")
    Long userId;

    @FilterField(entityField = "deck.id")
    Long deckId;

    @FilterField(entityField = "deckItem.id")
    Long deckItemId;

    @FilterField(entityField = "flashcard.id")
    Long flashcardId;

    @FilterField
    String result;
}
