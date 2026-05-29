package com.example.starter_project_2025.domain.library.quizlet.study_log;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface QuizletStudyLogMapper extends BaseCrudMapper<QuizletStudyLog, QuizletStudyLogDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "deckItem", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @Mapping(target = "sessionItem", ignore = true)
    QuizletStudyLog toEntity(QuizletStudyLogDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "deckId", source = "deck.id")
    @Mapping(target = "deckItemId", source = "deckItem.id")
    @Mapping(target = "flashcardId", source = "flashcard.id")
    @Mapping(target = "sessionItemId", source = "sessionItem.id")
    QuizletStudyLogDTO toResponse(QuizletStudyLog entity);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @Mapping(target = "deckItem", ignore = true)
    @Mapping(target = "flashcard", ignore = true)
    @Mapping(target = "sessionItem", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget QuizletStudyLog entity, QuizletStudyLogDTO dto);
}
