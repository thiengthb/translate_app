package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import com.example.starter_project_2025.domain.assessment.tag.QuestionTagMapper;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class, uses = QuestionTagMapper.class)
public interface QuestionBankMapper extends BaseCrudMapper<QuestionBank, QuestionBankDTO> {

    @Override
    @IgnoreAuditFields
    @Mapping(target = "options", ignore = true)
    @Mapping(target = "tags", ignore = true)
    QuestionBank toEntity(QuestionBankDTO dto);

    @Override
    @Mapping(target = "options", source = "options")
    @Mapping(target = "tags", source = "tags")
    @Mapping(target = "tagIds", ignore = true)
    QuestionBankDTO toResponse(QuestionBank question);

    @Override
    @Mapping(target = "options", ignore = true)
    @Mapping(target = "tags", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget QuestionBank question, QuestionBankDTO dto);

    @Mapping(target = "questionId", source = "question.id")
    QuestionOptionDTO optionToDto(QuestionOption option);
}
