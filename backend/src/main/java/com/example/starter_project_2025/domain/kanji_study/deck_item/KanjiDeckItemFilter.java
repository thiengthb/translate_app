package com.example.starter_project_2025.domain.kanji_study.deck_item;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import lombok.Builder;

@Builder
public class KanjiDeckItemFilter extends BaseFilter {

    @FilterField(entityField = "deck.id")
    Long deckId;

    @FilterField(entityField = "kanji.id")
    Long kanjiId;
}
