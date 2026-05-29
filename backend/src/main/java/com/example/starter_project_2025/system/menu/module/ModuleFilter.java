package com.example.starter_project_2025.system.menu.module;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModuleFilter extends BaseFilter {

    @FilterField(entityField = "moduleGroup.id")
    Long moduleGroupId;

    @FilterField(entityField = "title", operator = FilterOperator.LIKE)
    String title;
}
