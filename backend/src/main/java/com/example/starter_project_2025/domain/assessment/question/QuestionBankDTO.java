package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.domain.assessment.tag.QuestionTagDTO;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
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
public class QuestionBankDTO extends BaseDTO {

    Long categoryId;
    Long levelId;
    String itemType;

    @NotBlank(groups = OnCreate.class, message = "Question type is required")
    String questionType;

    @NotBlank(groups = OnCreate.class, message = "Prompt is required")
    String prompt;

    String promptAudioUrl;
    String promptImageUrl;
    String explanation;
    String hint;
    String difficultyLevel;

    @Builder.Default
    Double defaultScore = 1.0;

    /** Content version — bumped whenever the question's content changes. Read-only. */
    @JsonProperty(access = READ_ONLY)
    Integer contentVersion;

    @Valid
    @Builder.Default
    List<QuestionOptionDTO> options = new java.util.ArrayList<>();

    /** Tags attached to the question (read-only view). */
    @JsonProperty(access = READ_ONLY)
    List<QuestionTagDTO> tags;

    /** Tag IDs to attach on create/update (write-only). */
    List<Long> tagIds;
}
