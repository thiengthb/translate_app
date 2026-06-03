package com.example.starter_project_2025.domain.kanji_study.reading_progress;

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
public class KanjiReadingProgressDTO extends BaseDTO {

    Long userId;

    @NotNull(groups = OnCreate.class, message = "Reading set ID is required")
    Long setId;

    Long passageId;

    String status;

    LocalDateTime completedAt;
}
