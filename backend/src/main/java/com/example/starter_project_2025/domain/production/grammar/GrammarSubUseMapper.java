package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface GrammarSubUseMapper extends BaseCrudMapper<GrammarSubUse, GrammarSubUseDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "level", ignore = true)   // resolved from levelId in GrammarSubUseServiceImpl
    @Mapping(target = "grammar", ignore = true) // parent expression is set server-side, never via DTO
    GrammarSubUse toEntity(GrammarSubUseDTO dto);

    @Override
    @Mapping(target = "levelId", source = "level.id")
    @Mapping(target = "levelCode", source = "level.code")
    GrammarSubUseDTO toResponse(GrammarSubUse entity);
}
