package com.example.starter_project_2025.domain.library.quizlet.session_item;

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
public class QuizletSessionItemDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Session ID is required")
    Long sessionId;

    @NotNull(groups = OnCreate.class, message = "Deck item ID is required")
    Long deckItemId;

    @NotNull(groups = OnCreate.class, message = "Flashcard ID is required")
    Long flashcardId;

    Long wordId;

    @NotNull(groups = OnCreate.class, message = "Item order is required")
    Integer itemOrder;

    String userAnswer;

    Boolean isCorrect;

    String status;

    Integer responseTimeMs;

    LocalDateTime answeredAt;
}
