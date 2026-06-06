package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
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
public class GrammarSubUseDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    String name;

    /** FK to the shared {@code levels} table (writable). */
    Long levelId;

    /** JLPT code (e.g. {@code "N4"}) of {@link #levelId}, for display. */
    @JsonProperty(access = READ_ONLY)
    String levelCode;

    String nuanceDescription;

    @NotBlank(groups = OnCreate.class, message = "Detector key is required")
    String detectorKey;

    List<CommonMistake> commonMistakes;

    // Dictionary usage fields (grammar relation is set server-side, not via this DTO).
    Integer orderNo;

    String structurePattern;

    String exampleJp;

    String exampleVi;

    String exampleNote;
}
