package com.example.starter_project_2025.domain.grammar.progress;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface GrammarProgressMapper extends BaseCrudMapper<GrammarProgress, GrammarProgressDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "subUse", ignore = true)
    GrammarProgress toEntity(GrammarProgressDTO dto);

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "subUseId", source = "subUse.id")
    GrammarProgressDTO toResponse(GrammarProgress entity);

    @Override
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "subUse", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget GrammarProgress entity, GrammarProgressDTO dto);
}
