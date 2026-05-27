package com.example.starter_project_2025.system.words.word;

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
public class WordFilter extends BaseFilter {

    @FilterField(entityField = "level.id", operator = FilterOperator.EQUAL)
    Long levelId;

    @FilterField(entityField = "representation.id", operator = FilterOperator.EQUAL)
    Long representationId;

    @FilterField(entityField = "meaning.id", operator = FilterOperator.EQUAL)
    Long meaningId;

    @FilterField(operator = FilterOperator.LIKE)
    String wordType;
}