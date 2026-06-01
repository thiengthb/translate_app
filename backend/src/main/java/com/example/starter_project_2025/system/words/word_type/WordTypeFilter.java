package com.example.starter_project_2025.system.words.word_type;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WordTypeFilter extends BaseFilter {

    @FilterField(operator = FilterOperator.LIKE)
    String name;

    @FilterField(operator = FilterOperator.LIKE)
    String code;

    @FilterField(operator = FilterOperator.LIKE)
    String description;
}
