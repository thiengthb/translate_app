package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.mapper.BaseMapperConfig;
import com.example.starter_project_2025.base.crud.mapper.IgnoreAuditFields;
import org.mapstruct.*;

@Mapper(componentModel = "spring", config = BaseMapperConfig.class)
public interface FlashcardMapper extends BaseCrudMapper<Flashcard, FlashcardDTO> {

    /* ── Flashcard ↔ FlashcardDTO ────────────────────────────── */

    @Override
    @IgnoreAuditFields
    @Mapping(target = "sides", ignore = true)
    Flashcard toEntity(FlashcardDTO dto);

    @Override
    @Mapping(target = "sides", source = "sides")
    FlashcardDTO toResponse(Flashcard flashcard);

    @Override
    @Mapping(target = "sides", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(@MappingTarget Flashcard flashcard, FlashcardDTO dto);

    /* ── FlashcardSide ↔ SideDTO ─────────────────────────────── */

    FlashcardDTO.SideDTO sideToDto(FlashcardSide side);

    /* ── FlashcardSideContent ↔ ContentDTO ───────────────────── */

    FlashcardDTO.ContentDTO contentToDto(FlashcardSideContent content);
}
