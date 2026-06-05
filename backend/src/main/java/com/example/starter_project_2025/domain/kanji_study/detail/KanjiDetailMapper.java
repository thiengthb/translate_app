package com.example.starter_project_2025.domain.kanji_study.detail;

import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface KanjiDetailMapper {

    @IgnoreAuditFields
    @Mapping(target = "radical", ignore = true)
    KanjiDetail toEntity(KanjiDetailDTO dto);

    @Mapping(target = "radicalId", source = "radical.id")
    KanjiDetailDTO toResponse(KanjiDetail entity);

    @IgnoreAuditFields
    @Mapping(target = "radical", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget KanjiDetail entity, KanjiDetailDTO dto);
}
