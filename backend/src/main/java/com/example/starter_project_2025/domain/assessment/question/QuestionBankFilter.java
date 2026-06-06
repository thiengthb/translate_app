package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class QuestionBankFilter extends BaseFilter {

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

    /**
     * Quiz wizard scope. When provided, the list returns shared bank questions
     * PLUS this quiz's private questions. When absent, only shared questions
     * (ownerQuizId IS NULL) are returned. Handled manually in the service, so it
     * is intentionally NOT a @FilterField (which would force plain equality).
     */
    Long ownerQuizId;
}
