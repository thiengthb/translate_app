package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

import static com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY;

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

    /** FK to the shared {@code levels} table (writable). */
    Long levelId;

    /** JLPT code (e.g. {@code "N4"}) of {@link #levelId}, for display. */
    @JsonProperty(access = READ_ONLY)
    String levelCode;

    String titleGloss;

    List<String> textbookSources;

    String notes;
}
