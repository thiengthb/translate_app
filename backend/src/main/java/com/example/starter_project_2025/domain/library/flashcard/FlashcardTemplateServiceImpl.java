package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FlashcardTemplateServiceImpl
        extends BaseCrudServiceImpl<FlashcardTemplate, Long, FlashcardTemplateDTO, FlashcardTemplateFilter>
        implements FlashcardTemplateService {

    FlashcardTemplateMapper flashcardTemplateMapper;
    FlashcardTemplateRepository flashcardTemplateRepository;

    @Override
    protected BaseCrudRepository<FlashcardTemplate, Long> getRepository() {
        return flashcardTemplateRepository;
    }

    @Override
    protected BaseCrudMapper<FlashcardTemplate, FlashcardTemplateDTO> getMapper() {
        return flashcardTemplateMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name", "description"};
    }

    /* ─────────────────────────────────────────
       Lifecycle hooks
    ───────────────────────────────────────── */

    @Override
    protected void beforeDelete(FlashcardTemplate entity) {
        if (entity.isSystem()) {
            throw new IllegalStateException("System template cannot be deleted");
        }
    }

    /* ─────────────────────────────────────────
       Domain queries
    ───────────────────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public FlashcardTemplateDTO getDefaultTemplate(String cardType) {
        return flashcardTemplateRepository
                .findByCardTypeAndIsDefaultTrueAndIsSystemTrue(cardType)
                .map(flashcardTemplateMapper::toResponse)
                .orElse(null);
    }
}
