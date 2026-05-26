package com.example.starter_project_2025.system.vocabulary.meaning;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import com.example.starter_project_2025.system.vocabulary.language.Language;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface MeaningMapper extends BaseCrudMapper<Meaning, MeaningDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "language", ignore = true)  // resolved in service via languageId
    Meaning toEntity(MeaningDTO dto);

    @Override
    @Mapping(target = "languageId",   source = "language.id")
    @Mapping(target = "languageName", source = "language.name")
    MeaningDTO toResponse(Meaning meaning);

    @Override
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "language", ignore = true)  // resolved in service via languageId
    void update(@MappingTarget Meaning meaning, MeaningDTO dto);

    /** Helper used by toResponse to avoid NPE when language is null */
    default Long mapLanguageId(Language language) {
        return language != null ? language.getId() : null;
    }

    default String mapLanguageName(Language language) {
        return language != null ? language.getName() : null;
    }
}
