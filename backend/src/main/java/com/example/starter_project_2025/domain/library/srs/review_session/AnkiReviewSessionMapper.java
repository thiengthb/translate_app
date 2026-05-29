package com.example.starter_project_2025.domain.library.srs.review_session;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface AnkiReviewSessionMapper extends BaseCrudMapper<AnkiReviewSession, AnkiReviewSessionDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    AnkiReviewSession toEntity(AnkiReviewSessionDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "deckId", source = "deck.id")
    AnkiReviewSessionDTO toResponse(AnkiReviewSession entity);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget AnkiReviewSession entity, AnkiReviewSessionDTO dto);
}
