package com.example.starter_project_2025.domain.kanji_study.reading;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiReadingMapper {

    @IgnoreAuditFields
    @Mapping(target = "kanji", ignore = true)
    KanjiReading toEntity(KanjiReadingDTO dto);

    @Mapping(target = "kanjiId", source = "kanji.id")
    KanjiReadingDTO toResponse(KanjiReading entity);

    @IgnoreAuditFields
    @Mapping(target = "kanji", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiReading entity, KanjiReadingDTO dto);
}
