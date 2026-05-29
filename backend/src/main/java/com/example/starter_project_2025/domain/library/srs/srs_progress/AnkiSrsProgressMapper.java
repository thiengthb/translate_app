package com.example.starter_project_2025.domain.library.srs.srs_progress;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface AnkiSrsProgressMapper extends BaseCrudMapper<AnkiSrsProgress, AnkiSrsProgressDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    AnkiSrsProgress toEntity(AnkiSrsProgressDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "deckId", source = "deck.id")
    @Mapping(target = "flashcardId", source = "flashcard.id")
    AnkiSrsProgressDTO toResponse(AnkiSrsProgress entity);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget AnkiSrsProgress entity, AnkiSrsProgressDTO dto);
}
