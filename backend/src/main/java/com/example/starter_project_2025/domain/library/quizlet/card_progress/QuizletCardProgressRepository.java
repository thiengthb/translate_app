package com.example.starter_project_2025.domain.library.quizlet.card_progress;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizletCardProgressRepository extends BaseCrudRepository<QuizletCardProgress, Long> {

    boolean existsByUserIdAndDeckItemId(Long userId, Long deckItemId);

    boolean existsByUserIdAndDeckItemIdAndIdNot(Long userId, Long deckItemId, Long id);

    List<QuizletCardProgress> findByUserIdAndDeckId(Long userId, Long deckId);

    Optional<QuizletCardProgress> findByUserIdAndDeckItemId(Long userId, Long deckItemId);
}
