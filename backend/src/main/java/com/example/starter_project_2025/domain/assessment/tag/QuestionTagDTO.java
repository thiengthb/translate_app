package com.example.starter_project_2025.domain.assessment.tag;

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
public class QuestionTagDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Tag name is required")
    @Size(max = 150, message = "Name must not exceed 150 characters")
    String name;

    @Size(max = 150, message = "Code must not exceed 150 characters")
    String code;

    String description;

    /** User who created the tag; {@code null} = system tag. */
    Long createdByUser;
}
