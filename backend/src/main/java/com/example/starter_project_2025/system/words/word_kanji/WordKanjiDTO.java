package com.example.starter_project_2025.system.words.word_kanji;

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
public class WordKanjiDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Word is required")
    Long wordId;

    @NotNull(groups = OnCreate.class, message = "Kanji is required")
    Long kanjiId;

    String character;
    String onyomi;
    String kunyomi;
    String meaning;
    Integer stroke;
    String radical;
}