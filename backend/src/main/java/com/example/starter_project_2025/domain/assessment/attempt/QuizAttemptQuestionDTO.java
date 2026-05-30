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

    Map<String, Object> questionSnapshot;

    List<Map<String, Object>> optionsSnapshot;

    Integer orderIndex;

    Double score;

    Boolean isAnswered;

    Boolean isCorrect;

    Double earnedScore;

    LocalDateTime answeredAt;
}
