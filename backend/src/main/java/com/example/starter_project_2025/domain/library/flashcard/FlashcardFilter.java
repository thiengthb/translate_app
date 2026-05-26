package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class FlashcardFilter extends BaseFilter {

    @FilterField
    Long wordId;

    @FilterField
    String cardType;

    @FilterField
    String itemType;

    @FilterField(operator = FilterOperator.LIKE)
    String front;
}
