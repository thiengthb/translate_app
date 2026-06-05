package com.example.starter_project_2025.domain.kanji_study.detail;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class KanjiDetailFilter extends BaseFilter {

    @FilterField(entityField = "character", operator = FilterOperator.LIKE)
    String character;

    @FilterField(operator = FilterOperator.EQUAL)
    String jlptLevel;

    @FilterField(entityField = "radical.id")
    Long radicalId;
}
