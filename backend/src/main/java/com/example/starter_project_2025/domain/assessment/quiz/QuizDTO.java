package com.example.starter_project_2025.domain.assessment.quiz;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizDTO extends BaseDTO {

    Long quizTypeId;
    Long categoryId;
    Long levelId;
    Long creatorId;
    Long deckId;

    String code;

    @NotBlank(groups = OnCreate.class, message = "Title is required")
    String title;

    String description;

    @Builder.Default
    Integer totalQuestions = 0;

    @Builder.Default
    Double totalScore = 0.0;

    @Builder.Default
    Double passScore = 0.0;

    Integer timeLimitMinutes;
    String difficultyLevel;

    @Builder.Default
    Boolean isRandomQuestion = false;
    @Builder.Default
    Boolean isRandomOption = false;
    @Builder.Default
    Boolean allowRetake = true;

    Integer maxAttempts;

    @Builder.Default
    Boolean showAnswerAfterSubmit = true;
    @Builder.Default
    Boolean showExplanationAfterSubmit = true;

    @Builder.Default
    String visibility = "PRIVATE";
    @Builder.Default
    String status = "DRAFT";

    LocalDateTime publishedAt;
}
