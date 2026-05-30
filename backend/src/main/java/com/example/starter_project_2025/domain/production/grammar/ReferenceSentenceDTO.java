package com.example.starter_project_2025.domain.production.grammar;

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
public class ReferenceSentenceDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Sub-use is required")
    Long subUseId;

    @JsonProperty(access = READ_ONLY)
    String subUseName;

    @NotBlank(groups = OnCreate.class, message = "L1 text is required")
    String l1Text;

    @NotBlank(groups = OnCreate.class, message = "L2 text is required")
    String l2Text;
}
