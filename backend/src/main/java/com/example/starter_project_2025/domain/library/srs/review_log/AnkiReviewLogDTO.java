package com.example.starter_project_2025.domain.library.srs.review_log;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
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
public class AnkiReviewLogDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "User ID is required")
    Long userId;

    @NotNull(groups = OnCreate.class, message = "Progress ID is required")
    Long progressId;

    Long sessionItemId;

    @NotNull(groups = OnCreate.class, message = "Flashcard ID is required")
    Long flashcardId;

    @NotBlank(groups = OnCreate.class, message = "Rating is required")
    String rating;

    Double score;

    Integer timeTakenMs;

    Integer expectedTimeMs;

    Double oldMemoryScore;
    Double newMemoryScore;

    Double oldEaseFactor;
    Double newEaseFactor;

    Integer oldIntervalDays;
    Integer newIntervalDays;

    Integer oldReviewCount;
    Integer newReviewCount;

    Integer oldLapses;
    Integer newLapses;

    String oldState;
    String newState;

    String sourceType;

    Long sourceId;

    LocalDateTime reviewedAt;
}
