package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
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
public class GrammarDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Slug is required")
    String slug;

    @NotBlank(groups = OnCreate.class, message = "Form is required")
    String form;

    String jlptLevel;

    String titleGloss;

    List<String> textbookSources;

    String notes;
}
