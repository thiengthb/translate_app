package com.example.starter_project_2025.domain.assessment.attempt;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "quiz_attempts")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZ_ATTEMPT")
@EntityLabel(name = "Quiz Attempt", plural = "Quiz Attempts", description = "User quiz attempts")
@AutoCrud(path = "quiz-attempts")
@Filterable(fields = {"status", "isActive"})
@Sortable(fields = {"startedAt", "submittedAt", "createdAt"})
@AuditEnabled
public class QuizAttempt extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    Long userId;

    @Column(name = "quiz_id", nullable = false)
    Long quizId;

    @Column(name = "assignment_id")
    Long assignmentId;

    @Builder.Default
    @Column(length = 30, nullable = false)
    String status = "IN_PROGRESS";

    @Column(name = "started_at", nullable = false)
    LocalDateTime startedAt;

    @Column(name = "submitted_at")
    LocalDateTime submittedAt;

    @Column(name = "expired_at")
    LocalDateTime expiredAt;

    @Builder.Default
    @Column(name = "time_spent_seconds", nullable = false)
    int timeSpentSeconds = 0;

    @Builder.Default
    @Column(name = "total_questions", nullable = false)
    int totalQuestions = 0;

    @Builder.Default
    @Column(name = "answered_questions", nullable = false)
    int answeredQuestions = 0;

    @Builder.Default
    @Column(name = "correct_questions", nullable = false)
    int correctQuestions = 0;

    @Builder.Default
    @Column(name = "wrong_questions", nullable = false)
    int wrongQuestions = 0;

    @Builder.Default
    @Column(name = "skipped_questions", nullable = false)
    int skippedQuestions = 0;

    @Builder.Default
    @Column(name = "total_score", nullable = false)
    double totalScore = 0;

    @Builder.Default
    @Column(name = "earned_score", nullable = false)
    double earnedScore = 0;

    @Builder.Default
    @Column(nullable = false)
    double percentage = 0;

    @Builder.Default
    @Column(name = "is_passed", nullable = false)
    boolean isPassed = false;

    @Builder.Default
    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
    List<QuizAttemptQuestion> attemptQuestions = new ArrayList<>();
}
