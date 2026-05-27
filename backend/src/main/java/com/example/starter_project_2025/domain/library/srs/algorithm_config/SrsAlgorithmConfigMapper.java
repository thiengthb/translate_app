package com.example.starter_project_2025.domain.library.srs.algorithm_config;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface SrsAlgorithmConfigMapper extends BaseCrudMapper<SrsAlgorithmConfig, SrsAlgorithmConfigDTO> {

    @Override
    @IgnoreAuditFields
    SrsAlgorithmConfig toEntity(SrsAlgorithmConfigDTO dto);

    @Override
    SrsAlgorithmConfigDTO toResponse(SrsAlgorithmConfig entity);

    @Override
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget SrsAlgorithmConfig entity, SrsAlgorithmConfigDTO dto);
}
