package com.example.starter_project_2025.domain.library.srs.review_log;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnkiReviewLogRepository extends BaseCrudRepository<AnkiReviewLog, Long> {

    /**
     * All of a user's review logs for one deck, oldest first. This is the raw
     * history the FSRS reschedule engine replays per card to reconstruct the
     * Difficulty/Stability memory state. Ordered by {@code reviewedAt} so the
     * replay sees ratings in the exact sequence they happened.
     */
    List<AnkiReviewLog> findByUserIdAndDeckIdOrderByReviewedAtAsc(Long userId, Long deckId);
}
