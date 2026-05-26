package com.example.starter_project_2025.domain.library.favorite_deck;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
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
public class FavoriteDeckServiceImpl
        extends BaseCrudServiceImpl<FavoriteDeck, Long, FavoriteDeckDTO, FavoriteDeckFilter>
        implements FavoriteDeckService {

    FavoriteDeckMapper favoriteDeckMapper;
    FavoriteDeckRepository favoriteDeckRepository;
    UserRepository userRepository;
    DeckRepository deckRepository;

    @Override
    protected BaseCrudRepository<FavoriteDeck, Long> getRepository() {
        return favoriteDeckRepository;
    }

    @Override
    protected BaseCrudMapper<FavoriteDeck, FavoriteDeckDTO> getMapper() {
        return favoriteDeckMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{};
    }

    @Override
    protected void beforeCreate(FavoriteDeck favoriteDeck, FavoriteDeckDTO request, ValidationContext ctx) {

        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) {
            ctx.add("userId", "User not found");
            return;
        }
        favoriteDeck.setUser(user);

        Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
        if (deck == null) {
            ctx.add("deckId", "Deck not found");
            return;
        }
        favoriteDeck.setDeck(deck);

        if (favoriteDeckRepository.existsByUserIdAndDeckId(request.getUserId(), request.getDeckId())) {
            ctx.add("deckId", "Deck is already in favorites");
        }
    }

    @Override
    protected void beforeUpdate(FavoriteDeck favoriteDeck, FavoriteDeckDTO request, ValidationContext ctx) {

        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId()).orElse(null);
            if (user == null) {
                ctx.add("userId", "User not found");
                return;
            }
            favoriteDeck.setUser(user);
        }

        if (request.getDeckId() != null) {
            Deck deck = deckRepository.findById(request.getDeckId()).orElse(null);
            if (deck == null) {
                ctx.add("deckId", "Deck not found");
                return;
            }
            favoriteDeck.setDeck(deck);
        }

        Long userId = favoriteDeck.getUser().getId();
        Long deckId = favoriteDeck.getDeck().getId();
        if (favoriteDeckRepository.existsByUserIdAndDeckIdAndIdNot(userId, deckId, favoriteDeck.getId())) {
            ctx.add("deckId", "Deck is already in favorites");
        }
    }
}
