package com.example.starter_project_2025.domain.assessment.quiz_type;

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
@Table(name = "quiz_types")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZ_TYPE")
@EntityLabel(name = "Quiz Type", plural = "Quiz Types", description = "Lookup of quiz types")
@AutoCrud(path = "quiz-types")
@Searchable(fields = {"name", "code"})
@Filterable(fields = {"code", "isActive"})
@Sortable(fields = {"name", "createdAt"})
@SoftDelete
public class QuizType extends BaseEntity {

    @Column(nullable = false, length = 100)
    String name;

    @Column(nullable = false, length = 50, unique = true)
    String code;

    @Column(columnDefinition = "TEXT")
    String description;
}
