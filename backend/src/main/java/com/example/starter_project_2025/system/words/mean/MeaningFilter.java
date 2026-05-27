package com.example.starter_project_2025.system.words.mean;

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
public class MeaningFilter extends BaseFilter {

    @FilterField(entityField = "language.id", operator = FilterOperator.EQUAL)
    Long languageId;

    @FilterField(operator = FilterOperator.LIKE)
    String name;
}