package com.example.starter_project_2025.system.words.level;

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
public class LevelDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    String name;

    @NotBlank(groups = OnCreate.class, message = "Code is required")
    String code;
}