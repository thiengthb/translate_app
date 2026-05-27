package com.example.starter_project_2025.system.words.level;

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
public class LevelFilter extends BaseFilter {

    @FilterField(operator = FilterOperator.LIKE)
    String name;

    @FilterField(operator = FilterOperator.LIKE)
    String code;
}