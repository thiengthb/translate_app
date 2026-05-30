package com.example.starter_project_2025.domain.assessment.progress;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserQuizProgressDTO extends BaseDTO {

    Long userId;
    Long quizId;
    Integer attemptCount;
    Long bestAttemptId;
    Long latestAttemptId;
    Double bestScore;
    Double bestPercentage;
    Double latestScore;
    Double latestPercentage;
    LocalDateTime firstAttemptAt;
    LocalDateTime lastAttemptAt;
    LocalDateTime passedAt;
    String status;
}
