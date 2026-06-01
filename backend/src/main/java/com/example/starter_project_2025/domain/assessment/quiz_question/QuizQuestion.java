package com.example.starter_project_2025.domain.assessment.quiz_question;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "quiz_questions", uniqueConstraints = @UniqueConstraint(columnNames = {"quiz_id", "question_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZ_QUESTION")
@EntityLabel(name = "Quiz Question", plural = "Quiz Questions", description = "Question placement inside a quiz")
@AutoCrud(path = "quiz-questions")
@Filterable(fields = {"isActive"})
@Sortable(fields = {"orderIndex", "createdAt"})
@AuditEnabled
public class QuizQuestion extends BaseEntity {

    @Column(name = "quiz_id", nullable = false)
    Long quizId;

    @Column(name = "section_id")
    Long sectionId;

    @Column(name = "question_id", nullable = false)
    Long questionId;

    @Builder.Default
    @Column(name = "order_index", nullable = false)
    int orderIndex = 0;

    @Builder.Default
    @Column(nullable = false)
    double score = 1;

    @Builder.Default
    @Column(name = "is_required", nullable = false)
    boolean isRequired = true;
}
