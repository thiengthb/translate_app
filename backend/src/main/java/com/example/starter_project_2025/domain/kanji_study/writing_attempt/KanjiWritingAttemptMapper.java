package com.example.starter_project_2025.domain.kanji_study.writing_attempt;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiWritingAttemptMapper {

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "kanji", ignore = true)
    @Mapping(target = "sessionItem", ignore = true)
    KanjiWritingAttempt toEntity(KanjiWritingAttemptDTO dto);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "kanjiId", source = "kanji.id")
    @Mapping(target = "sessionItemId", source = "sessionItem.id")
    KanjiWritingAttemptDTO toResponse(KanjiWritingAttempt entity);

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "kanji", ignore = true)
    @Mapping(target = "sessionItem", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiWritingAttempt entity, KanjiWritingAttemptDTO dto);
}
