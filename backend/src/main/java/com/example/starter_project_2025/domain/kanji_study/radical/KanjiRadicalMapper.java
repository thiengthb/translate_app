package com.example.starter_project_2025.domain.kanji_study.radical;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiRadicalMapper {

    @IgnoreAuditFields
    KanjiRadical toEntity(KanjiRadicalDTO dto);

    KanjiRadicalDTO toResponse(KanjiRadical entity);

    @IgnoreAuditFields
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiRadical entity, KanjiRadicalDTO dto);
}
