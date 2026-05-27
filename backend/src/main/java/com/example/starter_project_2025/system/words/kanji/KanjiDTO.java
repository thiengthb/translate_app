package com.example.starter_project_2025.system.words.kanji;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Character is required")
    String character;

    String onyomi;
    String kunyomi;
    String meaning;
    String jlptLevel;
    Integer stroke;
    String radical;
}