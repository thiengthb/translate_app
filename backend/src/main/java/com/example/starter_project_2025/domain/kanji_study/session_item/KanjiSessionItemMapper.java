package com.example.starter_project_2025.domain.kanji_study.session_item;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiSessionItemMapper {

    @IgnoreAuditFields
    @Mapping(target = "session", ignore = true)
    @Mapping(target = "kanji", ignore = true)
    KanjiSessionItem toEntity(KanjiSessionItemDTO dto);

    @Mapping(target = "sessionId", source = "session.id")
    @Mapping(target = "kanjiId", source = "kanji.id")
    KanjiSessionItemDTO toResponse(KanjiSessionItem entity);

    @IgnoreAuditFields
    @Mapping(target = "session", ignore = true)
    @Mapping(target = "kanji", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiSessionItem entity, KanjiSessionItemDTO dto);
}
