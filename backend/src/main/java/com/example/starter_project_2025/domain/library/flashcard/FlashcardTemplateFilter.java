package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class FlashcardTemplateFilter extends BaseFilter {

    @FilterField
    Long userId;

    @FilterField
    String cardType;

    @FilterField
    Boolean isSystem;

    @FilterField
    Boolean isDefault;
}
