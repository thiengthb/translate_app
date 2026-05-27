package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import static com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WordDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Representation is required")
    Long representationId;

    @JsonProperty(access = READ_ONLY)
    String representationName;

    @NotNull(groups = OnCreate.class, message = "Meaning is required")
    Long meaningId;

    @JsonProperty(access = READ_ONLY)
    String meaningName;

    @NotNull(groups = OnCreate.class, message = "Level is required")
    Long levelId;

    @JsonProperty(access = READ_ONLY)
    String levelName;

    @NotBlank(groups = OnCreate.class, message = "Word is required")
    String word;

    String reading;
    String wordType;
    Integer frequency;
}