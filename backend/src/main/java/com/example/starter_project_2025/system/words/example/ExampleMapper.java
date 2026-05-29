package com.example.starter_project_2025.system.words.example;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface ExampleMapper extends BaseCrudMapper<Example, ExampleDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "rootLanguage.id", source = "rootLanguageId")
    @Mapping(target = "toLanguage.id", source = "toLanguageId")
    @Mapping(target = "word.id", source = "wordId")
    Example toEntity(ExampleDTO dto);

    @Override
    @Mapping(target = "rootLanguageId", source = "rootLanguage.id")
    @Mapping(target = "rootLanguageName", source = "rootLanguage.name")
    @Mapping(target = "toLanguageId", source = "toLanguage.id")
    @Mapping(target = "toLanguageName", source = "toLanguage.name")
    @Mapping(target = "wordId", source = "word.id")
    ExampleDTO toResponse(Example entity);
}