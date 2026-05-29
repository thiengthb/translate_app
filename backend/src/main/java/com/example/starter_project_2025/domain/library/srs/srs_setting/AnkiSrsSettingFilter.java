package com.example.starter_project_2025.domain.library.srs.srs_setting;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class AnkiSrsSettingFilter extends BaseFilter {

    @FilterField(entityField = "user.id")
    Long userId;

    @FilterField(entityField = "deck.id")
    Long deckId;

    @FilterField(entityField = "algorithmConfig.id")
    Long algorithmConfigId;
}
