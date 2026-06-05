package com.example.starter_project_2025.domain.kanji_study.session;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiStudySessionMapper {

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    KanjiStudySession toEntity(KanjiStudySessionDTO dto);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "deckId", source = "deck.id")
    KanjiStudySessionDTO toResponse(KanjiStudySession entity);

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiStudySession entity, KanjiStudySessionDTO dto);
}
