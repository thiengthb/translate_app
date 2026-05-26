package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import com.example.starter_project_2025.domain.library.tag.Tag;
import org.mapstruct.*;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface DeckMapper extends BaseCrudMapper<Deck, DeckDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "folder", ignore = true)
    @Mapping(target = "originalDeck", ignore = true)
    @Mapping(target = "tags", ignore = true)
    Deck toEntity(DeckDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "folderId", source = "folder.id")
    @Mapping(target = "originalDeckId", source = "originalDeck.id")
    @Mapping(target = "tagIds", expression = "java(mapTagIds(deck))")
    DeckDTO toResponse(Deck deck);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "folder", ignore = true)
    @Mapping(target = "originalDeck", ignore = true)
    @Mapping(target = "tags", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget Deck deck, DeckDTO dto);

    default Set<Long> mapTagIds(Deck deck) {
        if (deck.getTags() == null) return null;
        return deck.getTags().stream().map(Tag::getId).collect(Collectors.toSet());
    }
}
