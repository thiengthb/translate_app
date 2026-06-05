package com.example.starter_project_2025.domain.kanji_study.writing_attempt;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiWritingAttemptDTO extends BaseDTO {

    Long userId;

    @NotNull(groups = OnCreate.class, message = "Kanji ID is required")
    Long kanjiId;

    Long sessionItemId;

    Double accuracyScore;

    Integer strokesDrawn;

    Boolean passed;

    String attemptData;
}
