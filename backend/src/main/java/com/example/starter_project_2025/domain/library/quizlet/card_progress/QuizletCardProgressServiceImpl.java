package com.example.starter_project_2025.domain.library.quizlet.card_progress;

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
public class QuizletCardProgressServiceImpl
        extends BaseCrudServiceImpl<QuizletCardProgress, Long, QuizletCardProgressDTO, QuizletCardProgressFilter>
        implements QuizletCardProgressService {

    QuizletCardProgressMapper mapper;
    QuizletCardProgressRepository repository;
    UserRepository userRepository;
    DeckRepository deckRepository;
    DeckItemRepository deckItemRepository;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudRepository<QuizletCardProgress, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<QuizletCardProgress, QuizletCardProgressDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(QuizletCardProgress entity, QuizletCardProgressDTO request, ValidationContext ctx) {
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

        if (repository.existsByUserIdAndDeckItemId(request.getUserId(), request.getDeckItemId())) {
            ctx.add("deckItemId", "Progress already exists for this user and deck item");
        }
    }

    @Override
    protected void beforeUpdate(QuizletCardProgress entity, QuizletCardProgressDTO request, ValidationContext ctx) {
        if (request.getDeckItemId() != null) {
            DeckItem deckItem = deckItemRepository.findById(request.getDeckItemId()).orElse(null);
            if (deckItem == null) { ctx.add("deckItemId", "Deck item not found"); return; }
            entity.setDeckItem(deckItem);

            Long userId = entity.getUser().getId();
            if (repository.existsByUserIdAndDeckItemIdAndIdNot(userId, request.getDeckItemId(), entity.getId())) {
                ctx.add("deckItemId", "Progress already exists for this user and deck item");
            }
        }

        if (request.getFlashcardId() != null) {
            Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
            if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
            entity.setFlashcard(flashcard);
        }
    }
}
