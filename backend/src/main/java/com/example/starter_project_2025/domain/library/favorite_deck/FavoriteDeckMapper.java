package com.example.starter_project_2025.domain.library.favorite_deck;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface FavoriteDeckMapper extends BaseCrudMapper<FavoriteDeck, FavoriteDeckDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    FavoriteDeck toEntity(FavoriteDeckDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "deckId", source = "deck.id")
    FavoriteDeckDTO toResponse(FavoriteDeck favoriteDeck);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget FavoriteDeck favoriteDeck, FavoriteDeckDTO dto);
}
