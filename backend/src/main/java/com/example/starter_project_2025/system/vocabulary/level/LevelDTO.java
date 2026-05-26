package com.example.starter_project_2025.system.vocabulary.level;

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
public class LevelDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Level name is required")
    String name;

    @NotBlank(groups = OnCreate.class, message = "Level code is required")
    @Size(max = 20, groups = {OnCreate.class, OnUpdate.class}, message = "Code must not exceed 20 characters")
    String code;
}
