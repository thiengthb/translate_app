package com.example.starter_project_2025.base.crud.dto;

import com.example.starter_project_2025.base.crud.spec.FilterField;
import com.example.starter_project_2025.base.crud.spec.FilterOperator;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Default filter applied to every list endpoint. Concrete enough to be used
 * directly when an entity needs no extra filter fields — declare your service
 * with {@code BaseCrudServiceImpl<E, I, D, BaseFilter>} and skip the per-entity
 * filter file. Subclass only when you need extra fields.
 */
@Getter
@Setter
public class BaseFilter {

    @FilterField(entityField = "id", operator = FilterOperator.IN)
    List<Long> ids;

    @FilterField(entityField = "isActive")
    Boolean isActive;

    @FilterField(entityField = "isDeleted")
    Boolean isDeleted;

    @FilterField(entityField = "tenantId")
    Long tenantId;

    @FilterField(entityField = "createdAt", operator = FilterOperator.BETWEEN)
    List<LocalDateTime> createdRange;

    @FilterField(entityField = "updatedAt", operator = FilterOperator.BETWEEN)
    List<LocalDateTime> updatedRange;

    @FilterField(entityField = "createdBy")
    Long createdBy;

    @FilterField(entityField = "updatedBy")
    Long updatedBy;
}
