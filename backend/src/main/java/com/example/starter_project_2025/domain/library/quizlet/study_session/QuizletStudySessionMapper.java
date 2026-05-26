package com.example.starter_project_2025.domain.library.quizlet.study_session;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface QuizletStudySessionMapper extends BaseCrudMapper<QuizletStudySession, QuizletStudySessionDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    QuizletStudySession toEntity(QuizletStudySessionDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "deckId", source = "deck.id")
    QuizletStudySessionDTO toResponse(QuizletStudySession entity);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "deck", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget QuizletStudySession entity, QuizletStudySessionDTO dto);
}
