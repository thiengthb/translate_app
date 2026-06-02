package com.example.starter_project_2025.domain.kanji_study.stroke_order;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiStrokeOrderMapper {

    @IgnoreAuditFields
    @Mapping(target = "kanji", ignore = true)
    KanjiStrokeOrder toEntity(KanjiStrokeOrderDTO dto);

    @Mapping(target = "kanjiId", source = "kanji.id")
    KanjiStrokeOrderDTO toResponse(KanjiStrokeOrder entity);

    @IgnoreAuditFields
    @Mapping(target = "kanji", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiStrokeOrder entity, KanjiStrokeOrderDTO dto);
}
