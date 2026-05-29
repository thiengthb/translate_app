package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FlashcardRepository extends BaseCrudRepository<Flashcard, Long> {
}
