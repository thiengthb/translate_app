package com.example.starter_project_2025.domain.library.srs.review_session_item;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class AnkiReviewSessionItemFilter extends BaseFilter {

    @FilterField(entityField = "session.id")
    Long sessionId;

    @FilterField(entityField = "flashcard.id")
    Long flashcardId;

    @FilterField
    String status;
}
