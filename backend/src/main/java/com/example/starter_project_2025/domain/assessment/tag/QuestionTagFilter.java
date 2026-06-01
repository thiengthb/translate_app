package com.example.starter_project_2025.domain.assessment.tag;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class QuestionTagFilter extends BaseFilter {

    @FilterField(operator = FilterOperator.LIKE)
    String name;

    @FilterField
    String code;

    @FilterField
    Long createdByUser;
}
