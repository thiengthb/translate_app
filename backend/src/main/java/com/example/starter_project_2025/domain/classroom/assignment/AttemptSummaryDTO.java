package com.example.starter_project_2025.domain.classroom.assignment;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * One quiz attempt by a student on an assignment — the per-attempt detail
 * shown when a row is expanded in the assignment statistics page.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AttemptSummaryDTO {

    Long attemptId;
    Integer attemptNumber;   // 1-based, ordered by startedAt
    String status;           // IN_PROGRESS / SUBMITTED / EXPIRED / CANCELLED
    Double earnedScore;
    Double totalScore;
    Double percentage;
    Boolean isPassed;
    Integer correctQuestions;
    Integer wrongQuestions;
    Integer skippedQuestions;
    Integer totalQuestions;
    Integer timeSpentSeconds;
    LocalDateTime startedAt;
    LocalDateTime submittedAt;
}
