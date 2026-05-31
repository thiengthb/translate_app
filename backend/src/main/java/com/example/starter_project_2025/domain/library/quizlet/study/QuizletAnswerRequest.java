package com.example.starter_project_2025.domain.library.quizlet.study;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * One graded answer in a non-SRS study mode (Flashcard / Learn / Write / Quiz).
 * Persisted into the Quizlet progress tables only — never touches SRS scheduling.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizletAnswerRequest {

    @NotNull
    Long deckId;

    @NotNull
    Long flashcardId;

    /** FLASHCARD | LEARN | MATCH | WRITE | QUIZ — for logging which mode produced the answer. */
    String mode;

    @NotNull
    Boolean correct;
}
