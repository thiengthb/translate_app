package com.example.starter_project_2025.domain.kanji_study.session;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class KanjiStudySessionFilter extends BaseFilter {

    @FilterField(entityField = "user.id")
    Long userId;

    @FilterField(entityField = "deck.id")
    Long deckId;

    @FilterField(operator = FilterOperator.EQUAL)
    String mode;
}
