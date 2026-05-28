package com.example.starter_project_2025.domain.library.srs.srs_progress;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AnkiSrsProgressDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "User ID is required")
    Long userId;

    @NotNull(groups = OnCreate.class, message = "Deck ID is required")
    Long deckId;

    @NotNull(groups = OnCreate.class, message = "Flashcard ID is required")
    Long flashcardId;

    String state;

    Double memoryScore;

    Double easeFactor;

    Integer intervalDays;

    Integer reviewCount;

    Integer learningStepIndex;

    Integer lapses;

    String lastRating;

    LocalDateTime firstLearnedAt;

    LocalDateTime lastReviewedAt;

    LocalDateTime nextReviewAt;
}
