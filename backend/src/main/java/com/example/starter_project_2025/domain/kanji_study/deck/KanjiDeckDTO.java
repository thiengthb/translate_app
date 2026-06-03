package com.example.starter_project_2025.domain.kanji_study.deck;

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
public class KanjiDeckDTO extends BaseDTO {

    Long userId;

    @NotBlank(groups = OnCreate.class, message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    String title;

    String description;

    String visibility;

    Boolean isSystem;

    String jlptLevel;

    String coverImageUrl;

    Integer totalKanji;
}
