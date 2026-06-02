package com.example.starter_project_2025.domain.kanji_study.detail;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class KanjiDetailFilter extends BaseFilter {

    @FilterField(entityField = "kanji.id")
    Long kanjiId;
}
