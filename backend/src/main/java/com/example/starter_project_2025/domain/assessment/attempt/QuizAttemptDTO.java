package com.example.starter_project_2025.domain.assessment.attempt;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizAttemptDTO extends BaseDTO {

    Long userId;
    Long quizId;
    Long assignmentId;

    String status;

    LocalDateTime startedAt;
    LocalDateTime submittedAt;

    Integer timeSpentSeconds;
    Integer totalQuestions;
    Integer answeredQuestions;
    Integer correctQuestions;
    Integer wrongQuestions;
    Integer skippedQuestions;

    Double totalScore;
    Double earnedScore;
    Double percentage;
    Boolean isPassed;

    @Builder.Default
    List<QuizAttemptQuestionDTO> attemptQuestions = new ArrayList<>();
}
