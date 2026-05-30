package com.example.starter_project_2025.domain.assessment.quiz_question;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.domain.assessment.question.QuestionBankDTO;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizQuestionDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Quiz id is required")
    Long quizId;

    Long sectionId;

    @NotNull(groups = OnCreate.class, message = "Question id is required")
    Long questionId;

    @Builder.Default
    Integer orderIndex = 0;

    @Builder.Default
    Double score = 1.0;

    @Builder.Default
    Boolean isRequired = true;

    /** Populated only by GET /quizzes/{id}/questions — the embedded question detail. */
    QuestionBankDTO question;
}
