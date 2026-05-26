package com.example.starter_project_2025.domain.library.quizlet.study_session;

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
public class QuizletStudySessionDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "User ID is required")
    Long userId;

    @NotNull(groups = OnCreate.class, message = "Deck ID is required")
    Long deckId;

    String mode;

    @NotNull(groups = OnCreate.class, message = "Started at is required")
    LocalDateTime startedAt;

    LocalDateTime endedAt;

    Integer totalItems;

    Integer completedItems;
}
