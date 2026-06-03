package com.example.starter_project_2025.domain.assessment.quiz;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "quizzes")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZ")
@ResourceMenu(
        title = "Quizzes",
        group = "Assessment",
        icon = "clipboard-list",
        url = "/quizzes",
        order = 1,
        permission = "QUIZ_READ"
)
@EntityLabel(name = "Quiz", plural = "Quizzes", description = "Quiz / test management")
@AutoCrud(path = "quizzes")
@Searchable(fields = {"title", "description", "code"})
@Filterable(fields = {"status", "visibility", "difficultyLevel", "isActive"})
@Sortable(fields = {"title", "createdAt", "updatedAt", "publishedAt"})
@SoftDelete
@AuditEnabled
public class Quiz extends BaseEntity {

    @Column(name = "quiz_type_id")
    Long quizTypeId;

    @Column(name = "category_id")
    Long categoryId;

    @Column(name = "level_id")
    Long levelId;

    @Column(name = "creator_id")
    Long creatorId;

    @Column(name = "deck_id")
    Long deckId;

    @Column(length = 50, unique = true)
    String code;

    @Column(nullable = false, length = 255)
    String title;

    @Column(columnDefinition = "TEXT")
    String description;

    @Builder.Default
    @Column(name = "total_questions", nullable = false)
    int totalQuestions = 0;

    @Builder.Default
    @Column(name = "total_score", nullable = false)
    double totalScore = 0;

    @Builder.Default
    @Column(name = "pass_score", nullable = false)
    double passScore = 0;

    @Column(name = "time_limit_minutes")
    Integer timeLimitMinutes;

    @Column(name = "difficulty_level", length = 30)
    String difficultyLevel;

    @Builder.Default
    @Column(name = "is_random_question", nullable = false)
    boolean isRandomQuestion = false;

    @Builder.Default
    @Column(name = "is_random_option", nullable = false)
    boolean isRandomOption = false;

    @Builder.Default
    @Column(name = "allow_retake", nullable = false)
    boolean allowRetake = true;

    @Column(name = "max_attempts")
    Integer maxAttempts;

    @Builder.Default
    @Column(name = "show_answer_after_submit", nullable = false)
    boolean showAnswerAfterSubmit = true;

    @Builder.Default
    @Column(name = "show_explanation_after_submit", nullable = false)
    boolean showExplanationAfterSubmit = true;

    @Builder.Default
    @Column(length = 30, nullable = false)
    String visibility = "PRIVATE";

    @Builder.Default
    @Column(length = 30, nullable = false)
    String status = "DRAFT";

    @Column(name = "published_at")
    LocalDateTime publishedAt;
}
