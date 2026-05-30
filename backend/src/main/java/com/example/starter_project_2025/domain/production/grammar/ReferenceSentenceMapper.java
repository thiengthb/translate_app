package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface ReferenceSentenceMapper extends BaseCrudMapper<ReferenceSentence, ReferenceSentenceDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "subUse.id", source = "subUseId")
    ReferenceSentence toEntity(ReferenceSentenceDTO dto);

    @Override
    @Mapping(target = "subUseId", source = "subUse.id")
    @Mapping(target = "subUseName", source = "subUse.name")
    ReferenceSentenceDTO toResponse(ReferenceSentence entity);
}
