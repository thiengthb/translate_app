package com.example.starter_project_2025.system.words.mean;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface MeaningMapper extends BaseCrudMapper<Meaning, MeaningDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "language.id", source = "languageId")
    Meaning toEntity(MeaningDTO dto);

    @Override
    @Mapping(target = "languageId", source = "language.id")
    @Mapping(target = "languageName", source = "language.name")
    MeaningDTO toResponse(Meaning entity);
}