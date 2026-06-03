package com.example.starter_project_2025.domain.kanji_study.progress;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiProgressMapper {

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "kanji", ignore = true)
    KanjiProgress toEntity(KanjiProgressDTO dto);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "kanjiId", source = "kanji.id")
    KanjiProgressDTO toResponse(KanjiProgress entity);

    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "kanji", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiProgress entity, KanjiProgressDTO dto);
}
