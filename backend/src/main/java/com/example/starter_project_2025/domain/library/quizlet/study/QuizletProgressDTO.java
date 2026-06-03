package com.example.starter_project_2025.domain.library.quizlet.study;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/** Per-card Quizlet study progress, keyed by flashcard for the frontend. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizletProgressDTO {

    Long id;
    Long flashcardId;
    Long deckItemId;
    String status;
    int correctCount;
    int wrongCount;
    Boolean lastAnswerCorrect;
    LocalDateTime lastStudiedAt;
}
