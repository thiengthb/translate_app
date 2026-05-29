package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class DeckFilter extends BaseFilter {

    @FilterField(entityField = "user.id")
    Long userId;

    @FilterField(entityField = "folder.id")
    Long folderId;

    @FilterField(operator = FilterOperator.LIKE)
    String title;

    @FilterField
    String visibility;

    @FilterField
    String studyMode;
}
