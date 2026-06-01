package com.example.starter_project_2025.domain.library.deck_item;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DeckItemServiceImpl
        extends BaseCrudServiceImpl<DeckItem, Long, DeckItemDTO, DeckItemFilter>
        implements DeckItemService {

    DeckItemMapper deckItemMapper;
    DeckItemRepository deckItemRepository;
    DeckRepository deckRepository;
    FlashcardRepository flashcardRepository;

    @Override
    protected BaseCrudRepository<DeckItem, Long> getRepository() {
        return deckItemRepository;
    }

    @Override
    protected BaseCrudMapper<DeckItem, DeckItemDTO> getMapper() {
        return deckItemMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(DeckItem deckItem, DeckItemDTO request, ValidationContext ctx) {

        Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
        if (deck == null) {
            ctx.add("deckId", "Deck not found");
            return;
        }
        deckItem.setDeck(deck);

        Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
        if (flashcard == null) {
            ctx.add("flashcardId", "Flashcard not found");
            return;
        }
        deckItem.setFlashcard(flashcard);

        if (deckItemRepository.existsByDeckIdAndFlashcardId(request.getDeckId(), request.getFlashcardId())) {
            ctx.add("flashcardId", "Flashcard already exists in this deck");
        }
    }

    @Override
    protected void beforeUpdate(DeckItem deckItem, DeckItemDTO request, ValidationContext ctx) {

        if (request.getDeckId() != null) {
            Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
            if (deck == null) {
                ctx.add("deckId", "Deck not found");
                return;
            }
            deckItem.setDeck(deck);
        }

        if (request.getFlashcardId() != null) {
            Flashcard flashcard = flashcardRepository.findById(request.getFlashcardId()).orElse(null);
            if (flashcard == null) {
                ctx.add("flashcardId", "Flashcard not found");
                return;
            }
            deckItem.setFlashcard(flashcard);
        }

        Long deckId = deckItem.getDeck().getId();
        Long flashcardId = deckItem.getFlashcard().getId();
        if (deckItemRepository.existsByDeckIdAndFlashcardIdAndIdNot(deckId, flashcardId, deckItem.getId())) {
            ctx.add("flashcardId", "Flashcard already exists in this deck");
        }
    }
}
