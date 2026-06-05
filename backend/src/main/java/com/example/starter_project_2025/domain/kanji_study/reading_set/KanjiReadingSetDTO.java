package com.example.starter_project_2025.domain.kanji_study.reading_set;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiReadingSetDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    String title;

    String description;

    String level;

    Integer orderIndex;
}
