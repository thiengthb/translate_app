package com.example.starter_project_2025.system.words.language;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
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

    @NotBlank(groups = OnCreate.class, message = "Code is required")
    @Size(max = 10, message = "Code must not exceed 10 characters")
    String code;

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    String name;
}
