package com.example.starter_project_2025.domain.kanji_study.reading_passage;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiReadingPassageMapper {

    @IgnoreAuditFields
    @Mapping(target = "readingSet", ignore = true)
    KanjiReadingPassage toEntity(KanjiReadingPassageDTO dto);

    @Mapping(target = "setId", source = "readingSet.id")
    KanjiReadingPassageDTO toResponse(KanjiReadingPassage entity);

    @IgnoreAuditFields
    @Mapping(target = "readingSet", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiReadingPassage entity, KanjiReadingPassageDTO dto);
}
