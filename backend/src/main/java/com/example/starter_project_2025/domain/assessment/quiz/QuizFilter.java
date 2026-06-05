package com.example.starter_project_2025.domain.assessment.quiz;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class QuizFilter extends BaseFilter {

    @FilterField
    Long levelId;

    @FilterField
    Long creatorId;

    @FilterField
    Long deckId;

    @FilterField(operator = FilterOperator.LIKE)
    String title;

    @FilterField
    String status;

    @FilterField
    String visibility;

    @FilterField
    String difficultyLevel;
}
