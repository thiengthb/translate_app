package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/flashcard-templates")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "FlashcardTemplate", description = "APIs for managing flashcard templates")
public class FlashcardTemplateController
        extends BaseCrudDataIoController<FlashcardTemplate, Long, FlashcardTemplateDTO, FlashcardTemplateFilter> {

    FlashcardTemplateService flashcardTemplateService;
    FlashcardTemplateRepository flashcardTemplateRepository;

    @Override
    protected BaseCrudService<Long, FlashcardTemplateDTO, FlashcardTemplateFilter> getService() {
        return flashcardTemplateService;
    }

    @Override
    protected BaseCrudRepository<FlashcardTemplate, Long> getRepository() {
        return flashcardTemplateRepository;
    }

    @Override
    protected Class<FlashcardTemplate> getEntityClass() {
        return FlashcardTemplate.class;
    }

    /* ─────────────────────────────────────────
       Default template lookup
    ───────────────────────────────────────── */

    @GetMapping("/default")
    public ResponseEntity<FlashcardTemplateDTO> getDefault(@RequestParam String cardType) {
        return ResponseEntity.ok(flashcardTemplateService.getDefaultTemplate(cardType));
    }
}
