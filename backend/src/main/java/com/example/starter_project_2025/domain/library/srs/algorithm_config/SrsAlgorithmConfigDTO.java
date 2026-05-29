package com.example.starter_project_2025.domain.library.srs.algorithm_config;

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
public class SrsAlgorithmConfigDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Code is required")
    @Size(max = 100)
    String code;

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    @Size(max = 255)
    String name;

    @NotBlank(groups = OnCreate.class, message = "Algorithm type is required")
    @Size(max = 50)
    String algorithmType;

    String configJson;

    Boolean enabled;
}
