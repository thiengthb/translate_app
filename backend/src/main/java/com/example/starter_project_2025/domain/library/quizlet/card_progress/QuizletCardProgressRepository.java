package com.example.starter_project_2025.domain.library.quizlet.card_progress;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizletCardProgressRepository extends BaseCrudRepository<QuizletCardProgress, Long> {

    boolean existsByUserIdAndDeckItemId(Long userId, Long deckItemId);

    boolean existsByUserIdAndDeckItemIdAndIdNot(Long userId, Long deckItemId, Long id);
}
