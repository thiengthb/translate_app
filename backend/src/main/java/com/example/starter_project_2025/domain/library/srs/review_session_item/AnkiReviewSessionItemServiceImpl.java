package com.example.starter_project_2025.domain.library.srs.review_session_item;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.srs.review_session.AnkiReviewSession;
import com.example.starter_project_2025.domain.library.srs.review_session.AnkiReviewSessionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AnkiReviewSessionItemServiceImpl
        extends BaseCrudServiceImpl<AnkiReviewSessionItem, Long, AnkiReviewSessionItemDTO, AnkiReviewSessionItemFilter>
        implements AnkiReviewSessionItemService {

    AnkiReviewSessionItemMapper mapper;
    AnkiReviewSessionItemRepository repository;
    AnkiReviewSessionRepository sessionRepository;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudRepository<AnkiReviewSessionItem, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<AnkiReviewSessionItem, AnkiReviewSessionItemDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(AnkiReviewSessionItem entity, AnkiReviewSessionItemDTO request, ValidationContext ctx) {
        AnkiReviewSession session = sessionRepository.findById(request.getSessionId()).orElse(null);
        if (session == null) { ctx.add("sessionId", "Session not found"); return; }
        entity.setSession(session);

        Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
        if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
        entity.setFlashcard(flashcard);
    }

    @Override
    protected void beforeUpdate(AnkiReviewSessionItem entity, AnkiReviewSessionItemDTO request, ValidationContext ctx) {
        if (request.getFlashcardId() != null) {
            Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
            if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
            entity.setFlashcard(flashcard);
        }
    }
}
