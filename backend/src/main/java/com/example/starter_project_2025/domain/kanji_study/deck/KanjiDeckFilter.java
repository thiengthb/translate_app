package com.example.starter_project_2025.domain.kanji_study.deck;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class KanjiDeckFilter extends BaseFilter {

    @FilterField(entityField = "user.id")
    Long userId;

    @FilterField(operator = FilterOperator.LIKE)
    String title;

    @FilterField(operator = FilterOperator.EQUAL)
    String visibility;

    @FilterField(operator = FilterOperator.EQUAL)
    Boolean isSystem;

    @FilterField(operator = FilterOperator.EQUAL)
    String jlptLevel;
}
