package com.example.starter_project_2025.domain.kanji_study.deck;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiDeckMapper {

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    KanjiDeck toEntity(KanjiDeckDTO dto);

    @Mapping(target = "userId", source = "user.id")
    KanjiDeckDTO toResponse(KanjiDeck entity);

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiDeck entity, KanjiDeckDTO dto);
}
