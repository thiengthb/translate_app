package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface FlashcardTemplateMapper extends BaseCrudMapper<FlashcardTemplate, FlashcardTemplateDTO> {

    @Override
    @IgnoreAuditFields
    FlashcardTemplate toEntity(FlashcardTemplateDTO dto);

    @Override
    FlashcardTemplateDTO toResponse(FlashcardTemplate template);

    @Override
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget FlashcardTemplate template, FlashcardTemplateDTO dto);
}
