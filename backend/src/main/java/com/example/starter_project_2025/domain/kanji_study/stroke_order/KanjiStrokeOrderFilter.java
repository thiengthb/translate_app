package com.example.starter_project_2025.domain.kanji_study.stroke_order;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class KanjiStrokeOrderFilter extends BaseFilter {

    @FilterField(entityField = "kanji.id")
    Long kanjiId;

    @FilterField(operator = FilterOperator.EQUAL)
    String source;
}
