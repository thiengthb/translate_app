package com.example.starter_project_2025.domain.kanji_study.radical;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class KanjiRadicalFilter extends BaseFilter {

    @FilterField(operator = FilterOperator.EQUAL)
    Integer number;

    @FilterField(operator = FilterOperator.EQUAL)
    Integer strokeCount;
}
