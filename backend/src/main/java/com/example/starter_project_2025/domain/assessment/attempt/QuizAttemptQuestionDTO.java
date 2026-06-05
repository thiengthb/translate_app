package com.example.starter_project_2025.domain.assessment.attempt;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizAttemptQuestionDTO extends BaseDTO {

    String questionType;

    Integer originalQuestionVersion;

    Map<String, Object> questionSnapshot;

    List<Map<String, Object>> optionsSnapshot;

    /** Answer key — only populated once the attempt is submitted / reveal is allowed. */
    Map<String, Object> correctAnswerSnapshot;

    Integer orderIndex;

    Double score;

    Boolean isAnswered;

    Boolean isCorrect;

    Double earnedScore;

    LocalDateTime answeredAt;

    /** User's own answer — only revealed after submit (same gate as correctAnswerSnapshot). */
    Map<String, Object> userAnswerSnapshot;
}
