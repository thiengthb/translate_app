package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlashcardTemplateRepository extends BaseCrudRepository<FlashcardTemplate, Long> {

    Optional<FlashcardTemplate> findByCardTypeAndIsDefaultTrueAndIsSystemTrue(String cardType);

    List<FlashcardTemplate> findByUserId(Long userId);
}
