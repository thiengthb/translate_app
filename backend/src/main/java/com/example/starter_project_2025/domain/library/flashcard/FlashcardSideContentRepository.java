package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlashcardSideContentRepository extends BaseCrudRepository<FlashcardSideContent, Long> {

    List<FlashcardSideContent> findBySideIdOrderByOrderIndex(Long sideId);
}
