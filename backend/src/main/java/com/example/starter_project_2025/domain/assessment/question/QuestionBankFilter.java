package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class QuestionBankFilter extends BaseFilter {

    @FilterField
    Long categoryId;

    @FilterField
    Long levelId;

    @FilterField
    String questionType;

    @FilterField
    String difficultyLevel;

    /** Filter the list endpoint to questions carrying this tag. */
    @FilterField(entityField = "tags.id")
    Long tagId;

    /** Owner scope — forced to the current user by the service (per-user bank). */
    @FilterField(entityField = "createdByUser")
    Long createdByUser;
}
