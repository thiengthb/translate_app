package com.example.starter_project_2025.domain.assessment.tag;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface QuestionTagMapper extends BaseCrudMapper<QuestionTag, QuestionTagDTO> {

    @Override
    @IgnoreAuditFields
    QuestionTag toEntity(QuestionTagDTO dto);

    @Override
    QuestionTagDTO toResponse(QuestionTag tag);

    @Override
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget QuestionTag tag, QuestionTagDTO dto);
}
