package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeckRepository extends BaseCrudRepository<Deck, Long> {

    boolean existsByTitleAndUserId(String title, Long userId);

    boolean existsByTitleAndUserIdAndIdNot(String title, Long userId, Long id);
}
