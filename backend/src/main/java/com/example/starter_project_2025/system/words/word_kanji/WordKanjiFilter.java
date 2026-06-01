package com.example.starter_project_2025.system.words.word_kanji;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WordKanjiFilter extends BaseFilter {

    @FilterField(entityField = "word.id", operator = FilterOperator.EQUAL)
    Long wordId;

    @FilterField(entityField = "kanji.id", operator = FilterOperator.EQUAL)
    Long kanjiId;
}