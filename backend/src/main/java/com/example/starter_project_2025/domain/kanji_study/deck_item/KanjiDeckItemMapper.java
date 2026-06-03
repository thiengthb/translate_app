package com.example.starter_project_2025.domain.kanji_study.deck_item;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiDeckItemMapper {

    @IgnoreAuditFields
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "kanji", ignore = true)
    KanjiDeckItem toEntity(KanjiDeckItemDTO dto);

    @Mapping(target = "deckId", source = "deck.id")
    @Mapping(target = "kanjiId", source = "kanji.id")
    KanjiDeckItemDTO toResponse(KanjiDeckItem entity);

    @IgnoreAuditFields
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "kanji", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiDeckItem entity, KanjiDeckItemDTO dto);
}
