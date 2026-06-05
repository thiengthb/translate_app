package com.example.starter_project_2025.domain.kanji_study.radical;

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
public class KanjiRadicalDTO extends BaseDTO {

    Integer number;

    @NotBlank(groups = OnCreate.class, message = "Radical character is required")
    String character;

    String hanViet;

    String meaning;

    Integer strokeCount;
}
