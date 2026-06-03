package com.example.starter_project_2025.domain.assessment.progress;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
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
@Table(name = "user_quiz_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "quiz_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("USER_QUIZ_PROGRESS")
@EntityLabel(name = "Quiz Progress", plural = "Quiz Progress", description = "Per-user quiz progress")
@AutoCrud(path = "user-quiz-progress")
@Filterable(fields = {"status", "isActive"})
@Sortable(fields = {"updatedAt", "lastAttemptAt"})
@AuditEnabled
public class UserQuizProgress extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    Long userId;

    @Column(name = "quiz_id", nullable = false)
    Long quizId;

    @Builder.Default
    @Column(name = "attempt_count", nullable = false)
    int attemptCount = 0;

    @Column(name = "best_attempt_id")
    Long bestAttemptId;

    @Column(name = "latest_attempt_id")
    Long latestAttemptId;

    @Builder.Default
    @Column(name = "best_score", nullable = false)
    double bestScore = 0;

    @Builder.Default
    @Column(name = "best_percentage", nullable = false)
    double bestPercentage = 0;

    @Builder.Default
    @Column(name = "latest_score", nullable = false)
    double latestScore = 0;

    @Builder.Default
    @Column(name = "latest_percentage", nullable = false)
    double latestPercentage = 0;

    @Column(name = "first_attempt_at")
    LocalDateTime firstAttemptAt;

    @Column(name = "last_attempt_at")
    LocalDateTime lastAttemptAt;

    @Column(name = "passed_at")
    LocalDateTime passedAt;

    @Builder.Default
    @Column(length = 30, nullable = false)
    String status = "NOT_STARTED";
}
