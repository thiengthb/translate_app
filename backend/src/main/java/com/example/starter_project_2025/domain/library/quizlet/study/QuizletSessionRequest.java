package com.example.starter_project_2025.domain.library.quizlet.study;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * Summary of a finished non-SRS study session (study time + cards viewed),
 * recorded for the Quizlet-side success metrics. Never touches SRS.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizletSessionRequest {

    @NotNull
    Long deckId;

    /** FLASHCARD | LEARN | MATCH | WRITE | QUIZ */
    String mode;

    @Builder.Default
    int totalItems = 0;

    @Builder.Default
    int completedItems = 0;

    LocalDateTime startedAt;

    LocalDateTime endedAt;
}
