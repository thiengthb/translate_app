package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.service.BaseCrudService;

public interface FlashcardTemplateService extends BaseCrudService<Long, FlashcardTemplateDTO, FlashcardTemplateFilter> {

    /**
     * Returns the system default template for a given card type, or null if no
     * such template exists (i.e. card_type=?, is_system=true, is_default=true).
     */
    FlashcardTemplateDTO getDefaultTemplate(String cardType);
}
