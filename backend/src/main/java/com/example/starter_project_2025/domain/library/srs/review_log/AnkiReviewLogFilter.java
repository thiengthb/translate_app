package com.example.starter_project_2025.domain.library.srs.review_log;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class AnkiReviewLogFilter extends BaseFilter {

    @FilterField(entityField = "user.id")
    Long userId;

    @FilterField(entityField = "progress.id")
    Long progressId;

    @FilterField(entityField = "flashcard.id")
    Long flashcardId;

    @FilterField
    String rating;

    @FilterField
    String sourceType;
}
