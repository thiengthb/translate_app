package com.example.starter_project_2025.domain.kanji_study.reading_progress;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiReadingProgressMapper {

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "readingSet", ignore = true)
    @Mapping(target = "passage", ignore = true)
    KanjiReadingProgress toEntity(KanjiReadingProgressDTO dto);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "setId", source = "readingSet.id")
    @Mapping(target = "passageId", source = "passage.id")
    KanjiReadingProgressDTO toResponse(KanjiReadingProgress entity);

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "readingSet", ignore = true)
    @Mapping(target = "passage", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiReadingProgress entity, KanjiReadingProgressDTO dto);
}
