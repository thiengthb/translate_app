package com.example.starter_project_2025.domain.assessment.attempt;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "quiz_attempt_questions")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizAttemptQuestion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    QuizAttempt attempt;

    @Column(name = "quiz_question_id")
    Long quizQuestionId;

    @Column(name = "original_question_id", nullable = false)
    Long originalQuestionId;

    @Column(name = "section_id")
    Long sectionId;

    @Column(name = "question_type", nullable = false, length = 50)
    String questionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "question_snapshot")
    Map<String, Object> questionSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options_snapshot")
    List<Map<String, Object>> optionsSnapshot;

    /** Internal grading key — never serialised to the student during the attempt. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "correct_answer_snapshot")
    Map<String, Object> correctAnswerSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "user_answer_snapshot")
    Map<String, Object> userAnswerSnapshot;

    @Builder.Default
    @Column(name = "order_index", nullable = false)
    int orderIndex = 0;

    @Builder.Default
    @Column(nullable = false)
    double score = 1;

    @Builder.Default
    @Column(name = "is_required", nullable = false)
    boolean isRequired = true;

    @Builder.Default
    @Column(name = "is_answered", nullable = false)
    boolean isAnswered = false;

    @Column(name = "is_correct")
    Boolean isCorrect;

    @Builder.Default
    @Column(name = "earned_score", nullable = false)
    double earnedScore = 0;

    @Column(name = "response_time_ms")
    Integer responseTimeMs;

    @Column(name = "answered_at")
    LocalDateTime answeredAt;
}
