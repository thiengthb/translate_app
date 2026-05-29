package com.example.starter_project_2025.domain.library.srs.review_session_item;

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
public class AnkiReviewSessionItemDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Session ID is required")
    Long sessionId;

    @NotNull(groups = OnCreate.class, message = "Flashcard ID is required")
    Long flashcardId;

    @NotNull(groups = OnCreate.class, message = "Item order is required")
    Integer itemOrder;

    String status;

    LocalDateTime answeredAt;
}
