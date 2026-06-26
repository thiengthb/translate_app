package com.example.starter_project_2025.domain.library.srs.review_log;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface AnkiReviewLogMapper extends BaseCrudMapper<AnkiReviewLog, AnkiReviewLogDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "progress", ignore = true)
    @Mapping(target = "sessionItem", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "algorithmConfig", ignore = true)
    AnkiReviewLog toEntity(AnkiReviewLogDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "progressId", source = "progress.id")
    @Mapping(target = "sessionItemId", source = "sessionItem.id")
    @Mapping(target = "flashcardId", source = "flashcard.id")
    @Mapping(target = "deckId", source = "deck.id")
    @Mapping(target = "algorithmConfigId", source = "algorithmConfig.id")
    AnkiReviewLogDTO toResponse(AnkiReviewLog entity);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "progress", ignore = true)
    @Mapping(target = "sessionItem", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "algorithmConfig", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget AnkiReviewLog entity, AnkiReviewLogDTO dto);
}
