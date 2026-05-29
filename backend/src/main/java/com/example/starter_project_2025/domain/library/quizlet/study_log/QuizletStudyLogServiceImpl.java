package com.example.starter_project_2025.domain.library.quizlet.study_log;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.quizlet.session_item.QuizletSessionItem;
import com.example.starter_project_2025.domain.library.quizlet.session_item.QuizletSessionItemRepository;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizletStudyLogServiceImpl
        extends BaseCrudServiceImpl<QuizletStudyLog, Long, QuizletStudyLogDTO, QuizletStudyLogFilter>
        implements QuizletStudyLogService {

    QuizletStudyLogMapper mapper;
    QuizletStudyLogRepository repository;
    UserRepository userRepository;
    DeckRepository deckRepository;
    DeckItemRepository deckItemRepository;
    FlashcardRepository flashcardRepository;
    QuizletSessionItemRepository sessionItemRepository;

    @Override
    protected BaseCrudRepository<QuizletStudyLog, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<QuizletStudyLog, QuizletStudyLogDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(QuizletStudyLog entity, QuizletStudyLogDTO request, ValidationContext ctx) {
        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) { ctx.add("userId", "User not found"); return; }
        entity.setUser(user);

        Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
        if (deck == null) { ctx.add("deckId", "Deck not found"); return; }
        entity.setDeck(deck);

        DeckItem deckItem = deckItemRepository.findById(request.getDeckItemId()).orElse(null);
        if (deckItem == null) { ctx.add("deckItemId", "Deck item not found"); return; }
        entity.setDeckItem(deckItem);

        Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
        if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
        entity.setFlashcard(flashcard);

        if (request.getSessionItemId() != null) {
            QuizletSessionItem sessionItem = sessionItemRepository.findById(request.getSessionItemId()).orElse(null);
            if (sessionItem == null) { ctx.add("sessionItemId", "Session item not found"); return; }
            entity.setSessionItem(sessionItem);
        }
    }

    @Override
    protected void beforeUpdate(QuizletStudyLog entity, QuizletStudyLogDTO request, ValidationContext ctx) {
    }
}
