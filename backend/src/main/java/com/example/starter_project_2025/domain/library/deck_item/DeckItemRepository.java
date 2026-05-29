package com.example.starter_project_2025.domain.library.deck_item;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeckItemRepository extends BaseCrudRepository<DeckItem, Long> {

    boolean existsByDeckIdAndFlashcardId(Long deckId, Long flashcardId);

    boolean existsByDeckIdAndFlashcardIdAndIdNot(Long deckId, Long flashcardId, Long id);

    List<DeckItem> findByDeckIdOrderByOrderIndexAsc(Long deckId);

    Optional<DeckItem> findFirstByFlashcardId(Long flashcardId);
}
