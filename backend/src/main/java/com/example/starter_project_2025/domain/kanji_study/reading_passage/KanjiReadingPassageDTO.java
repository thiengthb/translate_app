package com.example.starter_project_2025.domain.kanji_study.reading_passage;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiReadingPassageDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Reading set ID is required")
    Long setId;

    @NotBlank(groups = OnCreate.class, message = "Content is required")
    String content;

    String furigana;

    String translationVi;

    Integer orderIndex;
}
