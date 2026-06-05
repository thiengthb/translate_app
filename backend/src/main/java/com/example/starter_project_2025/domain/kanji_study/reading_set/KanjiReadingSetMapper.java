package com.example.starter_project_2025.domain.kanji_study.reading_set;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiReadingSetMapper {

    @IgnoreAuditFields
    KanjiReadingSet toEntity(KanjiReadingSetDTO dto);

    KanjiReadingSetDTO toResponse(KanjiReadingSet entity);

    @IgnoreAuditFields
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiReadingSet entity, KanjiReadingSetDTO dto);
}
