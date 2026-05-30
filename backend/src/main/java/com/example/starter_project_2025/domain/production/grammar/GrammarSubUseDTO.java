package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrammarSubUseDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    String name;

    String jlptLevel;

    String nuanceDescription;

    @NotBlank(groups = OnCreate.class, message = "Detector key is required")
    String detectorKey;

    List<CommonMistake> commonMistakes;
}
