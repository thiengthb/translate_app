package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.service.BaseCrudService;

import java.util.List;

public interface FlashcardService extends BaseCrudService<Long, FlashcardDTO, FlashcardFilter> {

    FlashcardDTO.ContentDTO addContent(Long sideId, FlashcardDTO.ContentDTO request);

    void removeContent(Long contentId);

    void reorderContents(Long sideId, List<Long> orderedContentIds);
}
