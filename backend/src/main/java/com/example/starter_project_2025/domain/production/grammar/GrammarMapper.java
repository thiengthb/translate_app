package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface GrammarMapper extends BaseCrudMapper<Grammar, GrammarDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "level", ignore = true) // resolved from levelId in GrammarServiceImpl
    Grammar toEntity(GrammarDTO dto);

    @Override
    @Mapping(target = "levelId", source = "level.id")
    @Mapping(target = "levelCode", source = "level.code")
    GrammarDTO toResponse(Grammar entity);
}
