package com.example.starter_project_2025.domain.library.favorite_deck;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FavoriteDeckRepository extends BaseCrudRepository<FavoriteDeck, Long> {

    boolean existsByUserIdAndDeckId(Long userId, Long deckId);

    boolean existsByUserIdAndDeckIdAndIdNot(Long userId, Long deckId, Long id);
}
