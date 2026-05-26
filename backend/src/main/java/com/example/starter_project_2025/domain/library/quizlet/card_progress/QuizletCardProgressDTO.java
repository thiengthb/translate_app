package com.example.starter_project_2025.domain.library.quizlet.card_progress;

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
public class QuizletCardProgressDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "User ID is required")
    Long userId;

    @NotNull(groups = OnCreate.class, message = "Deck ID is required")
    Long deckId;

    @NotNull(groups = OnCreate.class, message = "Deck item ID is required")
    Long deckItemId;

    @NotNull(groups = OnCreate.class, message = "Flashcard ID is required")
    Long flashcardId;

    Long wordId;

    String status;

    Integer correctCount;

    Integer wrongCount;

    Boolean lastAnswerCorrect;

    LocalDateTime lastStudiedAt;
}
