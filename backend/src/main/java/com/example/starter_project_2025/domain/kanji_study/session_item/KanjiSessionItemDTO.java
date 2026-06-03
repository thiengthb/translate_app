package com.example.starter_project_2025.domain.kanji_study.session_item;

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
public class KanjiSessionItemDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Session ID is required")
    Long sessionId;

    @NotNull(groups = OnCreate.class, message = "Kanji ID is required")
    Long kanjiId;

    Integer itemOrder;

    String userAnswer;

    Boolean isCorrect;

    Integer responseTimeMs;

    String status;

    LocalDateTime answeredAt;
}
