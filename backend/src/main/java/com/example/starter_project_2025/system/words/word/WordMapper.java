package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface WordMapper extends BaseCrudMapper<Word, WordDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "representation.id", source = "representationId")
    @Mapping(target = "meaning.id", source = "meaningId")
    @Mapping(target = "level.id", source = "levelId")
    Word toEntity(WordDTO dto);

    @Override
    @Mapping(target = "representationId", source = "representation.id")
    @Mapping(target = "representationName", source = "representation.name")
    @Mapping(target = "meaningId", source = "meaning.id")
    @Mapping(target = "meaningName", source = "meaning.name")
    @Mapping(target = "levelId", source = "level.id")
    @Mapping(target = "levelName", source = "level.name")
    WordDTO toResponse(Word entity);
}