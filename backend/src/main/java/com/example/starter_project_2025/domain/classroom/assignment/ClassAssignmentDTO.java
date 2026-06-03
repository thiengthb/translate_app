package com.example.starter_project_2025.domain.classroom.assignment;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClassAssignmentDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Classroom id is required")
    Long classroomId;

    @NotNull(groups = OnCreate.class, message = "Quiz id is required")
    Long quizId;

    Long createdBy;

    @NotBlank(groups = OnCreate.class, message = "Title is required")
    String title;

    String description;

    @Builder.Default
    Integer maxAttempts = 1;

    @Builder.Default
    String scoreStrategy = "LAST";

    LocalDateTime availableFrom;
    LocalDateTime deadline;

    @Builder.Default
    String status = "DRAFT";

    /** Enriched from the Quiz record. */
    String quizTitle;
}
