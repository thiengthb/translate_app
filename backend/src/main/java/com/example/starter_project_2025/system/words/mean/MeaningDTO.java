package com.example.starter_project_2025.system.words.mean;

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
public class MeaningDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Language is required")
    Long languageId;

    @JsonProperty(access = READ_ONLY)
    String languageName;

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    String name;
}