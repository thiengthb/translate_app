package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface GrammarMarkerMapper extends BaseCrudMapper<GrammarMarker, GrammarMarkerDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "subUse.id", source = "subUseId")
    GrammarMarker toEntity(GrammarMarkerDTO dto);

    @Override
    @Mapping(target = "subUseId", source = "subUse.id")
    @Mapping(target = "subUseName", source = "subUse.name")
    GrammarMarkerDTO toResponse(GrammarMarker entity);
}
