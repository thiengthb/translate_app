package com.example.starter_project_2025.domain.classroom.assignment;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StudentResultDTO {

    Long userId;
    String displayName;
    Integer attemptCount;
    Double bestScore;
    Double latestScore;
    Boolean isPassed;
    LocalDateTime submittedAt;
}
