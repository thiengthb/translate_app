package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface FlashcardMapper extends BaseCrudMapper<Flashcard, FlashcardDTO> {

    @Override
    @IgnoreAuditFields
    Flashcard toEntity(FlashcardDTO dto);

    @Override
    FlashcardDTO toResponse(Flashcard flashcard);

    @Override
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget Flashcard flashcard, FlashcardDTO dto);
}
