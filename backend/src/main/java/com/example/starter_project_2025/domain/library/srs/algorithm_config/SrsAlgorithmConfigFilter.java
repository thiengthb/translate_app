package com.example.starter_project_2025.domain.library.srs.algorithm_config;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Builder;

@Builder
public class SrsAlgorithmConfigFilter extends BaseFilter {

    @FilterField(operator = FilterOperator.LIKE)
    String code;

    @FilterField(operator = FilterOperator.LIKE)
    String name;

    @FilterField
    String algorithmType;

    @FilterField
    Boolean enabled;
}
