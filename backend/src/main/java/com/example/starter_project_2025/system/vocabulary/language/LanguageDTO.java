package com.example.starter_project_2025.system.vocabulary.language;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.base.crud.dto.OnUpdate;
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
public class LanguageDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Language code is required")
    @Size(max = 10, groups = {OnCreate.class, OnUpdate.class}, message = "Code must not exceed 10 characters")
    String code;

    @NotBlank(groups = OnCreate.class, message = "Language name is required")
    String name;
}
