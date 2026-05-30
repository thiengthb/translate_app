package com.example.starter_project_2025.domain.classroom.assignment;

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
@Table(name = "class_assignments")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("CLASS_ASSIGNMENT")
@EntityLabel(name = "Class Assignment", plural = "Class Assignments", description = "Quiz assignments in a classroom")
@AutoCrud(path = "class-assignments")
@Searchable(fields = {"title", "description"})
@Filterable(fields = {"status", "isActive"})
@Sortable(fields = {"deadline", "createdAt"})
@SoftDelete
@AuditEnabled
public class ClassAssignment extends BaseEntity {

    @Column(name = "class_id", nullable = false)
    Long classroomId;

    @Column(name = "quiz_id", nullable = false)
    Long quizId;

    @Column(name = "created_by", nullable = false)
    Long createdBy;

    @Column(nullable = false, length = 255)
    String title;

    @Column(columnDefinition = "TEXT")
    String description;

    @Builder.Default
    @Column(name = "max_attempts")
    Integer maxAttempts = 1;

    @Builder.Default
    @Column(name = "score_strategy", length = 20, nullable = false)
    String scoreStrategy = "LAST";

    @Column(name = "available_from")
    LocalDateTime availableFrom;

    @Column
    LocalDateTime deadline;

    @Builder.Default
    @Column(length = 20, nullable = false)
    String status = "DRAFT";
}
