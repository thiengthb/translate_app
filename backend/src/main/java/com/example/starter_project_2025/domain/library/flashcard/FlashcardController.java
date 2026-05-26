package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.controller.BaseCrudController;
import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/flashcards")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Flashcard", description = "APIs for managing flashcards")
public class FlashcardController
        extends BaseCrudDataIoController<Flashcard, Long, FlashcardDTO, FlashcardFilter> {

    FlashcardService flashcardService;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudService<Long, FlashcardDTO, FlashcardFilter> getService() {
        return flashcardService;
    }

    @Override
    protected BaseCrudRepository<Flashcard, Long> getRepository() {
        return flashcardRepository;
    }

    @Override
    protected Class<Flashcard> getEntityClass() {
        return Flashcard.class;
    }
}
