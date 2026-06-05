package com.example.starter_project_2025.domain.kanji_study.progress;

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
public class KanjiProgressDTO extends BaseDTO {

    Long userId;

    @NotNull(groups = OnCreate.class, message = "Kanji ID is required")
    Long kanjiId;

    String status;

    Integer correctCount;

    Integer wrongCount;

    Integer intervalDays;

    Double easeFactor;

    LocalDateTime nextReviewAt;

    LocalDateTime lastStudiedAt;
}
