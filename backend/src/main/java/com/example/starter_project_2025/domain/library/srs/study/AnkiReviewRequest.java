package com.example.starter_project_2025.domain.library.srs.study;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AnkiReviewRequest {

    @NotNull
    Long deckId;

    @NotNull
    Long flashcardId;

    /** AGAIN | HARD | GOOD | EASY */
    @NotNull
    String rating;

    Double score;

    Integer timeTakenMs;

    String sourceType;
}
