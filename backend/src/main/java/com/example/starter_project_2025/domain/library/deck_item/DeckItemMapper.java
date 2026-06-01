package com.example.starter_project_2025.domain.library.deck_item;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface DeckItemMapper extends BaseCrudMapper<DeckItem, DeckItemDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    DeckItem toEntity(DeckItemDTO dto);

    @Override
    @Mapping(target = "deckId", source = "deck.id")
    @Mapping(target = "flashcardId", source = "flashcard.id")
    DeckItemDTO toResponse(DeckItem deckItem);

    @Override
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget DeckItem deckItem, DeckItemDTO dto);
}
