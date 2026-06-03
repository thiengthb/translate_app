package com.example.starter_project_2025.domain.kanji_study.session;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiStudySessionDTO extends BaseDTO {

    Long userId;

    Long deckId;

    @NotBlank(groups = OnCreate.class, message = "Mode is required")
    String mode;

    LocalDateTime startedAt;

    LocalDateTime endedAt;

    Integer totalItems;

    Integer completedItems;
}
