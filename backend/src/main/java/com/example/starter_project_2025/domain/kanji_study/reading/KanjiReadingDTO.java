package com.example.starter_project_2025.domain.kanji_study.reading;

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
public class KanjiReadingDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Kanji ID is required")
    Long kanjiId;

    @NotBlank(groups = OnCreate.class, message = "Reading type is required")
    String readingType;

    @NotBlank(groups = OnCreate.class, message = "Value is required")
    String value;

    Integer priority;
}
