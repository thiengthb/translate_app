package com.example.starter_project_2025.domain.library.quizlet.session_item;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface QuizletSessionItemMapper extends BaseCrudMapper<QuizletSessionItem, QuizletSessionItemDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "session", ignore = true)
    @Mapping(target = "deckItem", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    QuizletSessionItem toEntity(QuizletSessionItemDTO dto);

    @Override
    @Mapping(target = "sessionId", source = "session.id")
    @Mapping(target = "deckItemId", source = "deckItem.id")
    @Mapping(target = "flashcardId", source = "flashcard.id")
    QuizletSessionItemDTO toResponse(QuizletSessionItem entity);

    @Override
    @Mapping(target = "session", ignore = true)
    @Mapping(target = "deckItem", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget QuizletSessionItem entity, QuizletSessionItemDTO dto);
}
