package com.example.starter_project_2025.system.words.word_type;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WordTypeDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    String name;

    @NotBlank(groups = OnCreate.class, message = "Code is required")
    String code;

    String description;
}
