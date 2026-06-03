package com.example.starter_project_2025.domain.kanji_study.detail;

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
public class KanjiDetailDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Kanji ID is required")
    Long kanjiId;

    String formExplanation;

    String etymology;
}
