package com.example.starter_project_2025.domain.library.srs.review_session;

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
public class AnkiReviewSessionDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "User ID is required")
    Long userId;

    Long deckId;

    @NotNull(groups = OnCreate.class, message = "Started at is required")
    LocalDateTime startedAt;

    LocalDateTime endedAt;

    Integer totalItems;

    Integer completedItems;

    Double averageScore;
}
