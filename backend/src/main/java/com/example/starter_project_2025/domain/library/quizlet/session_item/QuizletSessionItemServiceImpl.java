package com.example.starter_project_2025.domain.library.quizlet.session_item;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.quizlet.study_session.QuizletStudySession;
import com.example.starter_project_2025.domain.library.quizlet.study_session.QuizletStudySessionRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizletSessionItemServiceImpl
        extends BaseCrudServiceImpl<QuizletSessionItem, Long, QuizletSessionItemDTO, QuizletSessionItemFilter>
        implements QuizletSessionItemService {

    QuizletSessionItemMapper mapper;
    QuizletSessionItemRepository repository;
    QuizletStudySessionRepository sessionRepository;
    DeckItemRepository deckItemRepository;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudRepository<QuizletSessionItem, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<QuizletSessionItem, QuizletSessionItemDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(QuizletSessionItem entity, QuizletSessionItemDTO request, ValidationContext ctx) {
        QuizletStudySession session = sessionRepository.findById(request.getSessionId()).orElse(null);
        if (session == null) { ctx.add("sessionId", "Session not found"); return; }
        entity.setSession(session);

        DeckItem deckItem = deckItemRepository.findById(request.getDeckItemId()).orElse(null);
        if (deckItem == null) { ctx.add("deckItemId", "Deck item not found"); return; }
        entity.setDeckItem(deckItem);

        Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
        if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
        entity.setFlashcard(flashcard);
    }

    @Override
    protected void beforeUpdate(QuizletSessionItem entity, QuizletSessionItemDTO request, ValidationContext ctx) {
        if (request.getFlashcardId() != null) {
            Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
            if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
            entity.setFlashcard(flashcard);
        }
    }
}
