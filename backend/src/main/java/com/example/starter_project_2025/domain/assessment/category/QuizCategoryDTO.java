package com.example.starter_project_2025.domain.assessment.category;

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
public class QuizCategoryDTO extends BaseDTO {

    Long parentId;

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    String name;

    @NotBlank(groups = OnCreate.class, message = "Code is required")
    String code;

    String description;

    @Builder.Default
    Integer orderIndex = 0;

    /** Populated only by the tree endpoint. */
    List<QuizCategoryDTO> children;
}
