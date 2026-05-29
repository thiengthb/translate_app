package com.example.starter_project_2025.system.words.example;

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
public class ExampleDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Root language is required")
    Long rootLanguageId;

    @JsonProperty(access = READ_ONLY)
    String rootLanguageName;

    @NotNull(groups = OnCreate.class, message = "Target language is required")
    Long toLanguageId;

    @JsonProperty(access = READ_ONLY)
    String toLanguageName;

    @NotNull(groups = OnCreate.class, message = "Word is required")
    Long wordId;

    @NotBlank(groups = OnCreate.class, message = "Root example is required")
    String rootExample;

    String toExample;
}