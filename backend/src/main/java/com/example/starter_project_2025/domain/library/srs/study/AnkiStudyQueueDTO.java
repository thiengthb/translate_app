package com.example.starter_project_2025.domain.library.srs.study;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AnkiStudyQueueDTO {

    String deckTitle;
    List<AnkiStudyCardDTO> cards;
    int totalNew;
    int totalLearning;
    int totalReview;
    /** REVIEW cards whose nextReviewAt is already due; learning/relearning is not included. */
    int dueReviewCards;
    /** Backwards-compatible alias for dueReviewCards. */
    int totalDue;
}
