package com.example.starter_project_2025.domain.kanji_study.reading;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class KanjiReadingFilter extends BaseFilter {

    @FilterField(entityField = "kanji.id")
    Long kanjiId;

    @FilterField(operator = FilterOperator.EQUAL)
    String readingType;
}
