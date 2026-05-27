package com.example.starter_project_2025.domain.library.srs.review_session_item;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface AnkiReviewSessionItemMapper extends BaseCrudMapper<AnkiReviewSessionItem, AnkiReviewSessionItemDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "session", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    AnkiReviewSessionItem toEntity(AnkiReviewSessionItemDTO dto);

    @Override
    @Mapping(target = "sessionId", source = "session.id")
    @Mapping(target = "flashcardId", source = "flashcard.id")
    AnkiReviewSessionItemDTO toResponse(AnkiReviewSessionItem entity);

    @Override
    @Mapping(target = "session", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget AnkiReviewSessionItem entity, AnkiReviewSessionItemDTO dto);
}
