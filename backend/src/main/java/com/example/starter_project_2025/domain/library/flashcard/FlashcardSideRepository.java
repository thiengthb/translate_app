package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlashcardSideRepository extends BaseCrudRepository<FlashcardSide, Long> {

    List<FlashcardSide> findByFlashcardId(Long flashcardId);

    Optional<FlashcardSide> findByFlashcardIdAndSide(Long flashcardId, SideType side);
}
