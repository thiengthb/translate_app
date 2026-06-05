package com.example.starter_project_2025.domain.kanji_study.reading_passage;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class KanjiReadingPassageFilter extends BaseFilter {

    @FilterField(entityField = "readingSet.id")
    Long setId;
}
