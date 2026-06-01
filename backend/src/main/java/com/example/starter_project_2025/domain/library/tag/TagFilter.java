package com.example.starter_project_2025.domain.library.tag;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class TagFilter extends BaseFilter {

    @FilterField(entityField = "user.id")
    Long userId;

    @FilterField(operator = FilterOperator.LIKE)
    String name;
}
