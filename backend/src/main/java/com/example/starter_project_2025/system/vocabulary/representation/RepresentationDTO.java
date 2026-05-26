package com.example.starter_project_2025.system.vocabulary.representation;

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
public class RepresentationDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Representation name is required")
    String name;

    @NotBlank(groups = OnCreate.class, message = "Representation code is required")
    @Size(max = 30, groups = {OnCreate.class, OnUpdate.class}, message = "Code must not exceed 30 characters")
    String code;
}
