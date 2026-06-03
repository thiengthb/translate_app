package com.example.starter_project_2025.domain.kanji_study.reading_set;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class KanjiReadingSetFilter extends BaseFilter {

    @FilterField(operator = FilterOperator.LIKE)
    String title;

    @FilterField(operator = FilterOperator.EQUAL)
    String level;
}
