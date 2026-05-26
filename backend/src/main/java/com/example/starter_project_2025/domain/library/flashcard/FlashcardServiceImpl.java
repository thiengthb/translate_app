package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FlashcardServiceImpl
        extends BaseCrudServiceImpl<Flashcard, Long, FlashcardDTO, FlashcardFilter>
        implements FlashcardService {

    FlashcardMapper flashcardMapper;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudRepository<Flashcard, Long> getRepository() {
        return flashcardRepository;
    }

    @Override
    protected BaseCrudMapper<Flashcard, FlashcardDTO> getMapper() {
        return flashcardMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"front", "back", "hint"};
    }

    @Override
    protected void beforeCreate(Flashcard flashcard, FlashcardDTO request, ValidationContext ctx) {
    }

    @Override
    protected void beforeUpdate(Flashcard flashcard, FlashcardDTO request, ValidationContext ctx) {
    }
}
