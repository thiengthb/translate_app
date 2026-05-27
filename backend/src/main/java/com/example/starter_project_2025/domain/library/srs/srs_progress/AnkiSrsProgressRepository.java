package com.example.starter_project_2025.domain.library.srs.srs_progress;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnkiSrsProgressRepository extends BaseCrudRepository<AnkiSrsProgress, Long> {

    boolean existsByUserIdAndDeckIdAndFlashcardId(Long userId, Long deckId, Long flashcardId);

    boolean existsByUserIdAndDeckIdAndFlashcardIdAndIdNot(Long userId, Long deckId, Long flashcardId, Long id);
}
