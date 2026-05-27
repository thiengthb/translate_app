package com.example.starter_project_2025.domain.library.srs.srs_progress;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
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
public class AnkiSrsProgressServiceImpl
        extends BaseCrudServiceImpl<AnkiSrsProgress, Long, AnkiSrsProgressDTO, AnkiSrsProgressFilter>
        implements AnkiSrsProgressService {

    AnkiSrsProgressMapper mapper;
    AnkiSrsProgressRepository repository;
    UserRepository userRepository;
    DeckRepository deckRepository;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudRepository<AnkiSrsProgress, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<AnkiSrsProgress, AnkiSrsProgressDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(AnkiSrsProgress entity, AnkiSrsProgressDTO request, ValidationContext ctx) {
        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) { ctx.add("userId", "User not found"); return; }
        entity.setUser(user);

        Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
        if (deck == null) { ctx.add("deckId", "Deck not found"); return; }
        entity.setDeck(deck);

        Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
        if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
        entity.setFlashcard(flashcard);

        if (repository.existsByUserIdAndDeckIdAndFlashcardId(
                request.getUserId(), request.getDeckId(), request.getFlashcardId())) {
            ctx.add("flashcardId", "Progress already exists for this user/deck/flashcard");
        }
    }

    @Override
    protected void beforeUpdate(AnkiSrsProgress entity, AnkiSrsProgressDTO request, ValidationContext ctx) {
        if (request.getDeckId() != null) {
            Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
            if (deck == null) { ctx.add("deckId", "Deck not found"); return; }
            entity.setDeck(deck);
        }
        if (request.getFlashcardId() != null) {
            Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
            if (flashcard == null) { ctx.add("flashcardId", "Flashcard not found"); return; }
            entity.setFlashcard(flashcard);
        }
    }
}
