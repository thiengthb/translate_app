package com.example.starter_project_2025.domain.classroom.assignment;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GradebookDTO {

    Long assignmentId;
    String assignmentTitle;
    Integer totalStudents;
    Integer passedCount;
    Double averageScore;

    @Builder.Default
    List<StudentResultDTO> results = new ArrayList<>();
}
