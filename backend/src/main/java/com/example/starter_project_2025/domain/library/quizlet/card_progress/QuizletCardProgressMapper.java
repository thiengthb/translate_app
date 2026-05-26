package com.example.starter_project_2025.domain.library.quizlet.card_progress;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface QuizletCardProgressMapper extends BaseCrudMapper<QuizletCardProgress, QuizletCardProgressDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "deckItem", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    QuizletCardProgress toEntity(QuizletCardProgressDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "deckId", source = "deck.id")
    @Mapping(target = "deckItemId", source = "deckItem.id")
    @Mapping(target = "flashcardId", source = "flashcard.id")
    QuizletCardProgressDTO toResponse(QuizletCardProgress entity);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "deckItem", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget QuizletCardProgress entity, QuizletCardProgressDTO dto);
}
