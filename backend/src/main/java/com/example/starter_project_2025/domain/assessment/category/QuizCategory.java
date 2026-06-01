package com.example.starter_project_2025.domain.assessment.category;

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
@Table(name = "quiz_categories")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUIZ_CATEGORY")
@EntityLabel(name = "Quiz Category", plural = "Quiz Categories", description = "Quiz category taxonomy")
@AutoCrud(path = "quiz-categories")
@Searchable(fields = {"name", "code"})
@Filterable(fields = {"code", "isActive"})
@Sortable(fields = {"orderIndex", "name", "createdAt"})
@SoftDelete
public class QuizCategory extends BaseEntity {

    /** Self-referencing parent id (null = root). Stored as a plain column. */
    @Column(name = "parent_id")
    Long parentId;

    @Column(nullable = false, length = 150)
    String name;

    @Column(nullable = false, length = 50, unique = true)
    String code;

    @Column(columnDefinition = "TEXT")
    String description;

    @Builder.Default
    @Column(name = "order_index", nullable = false)
    int orderIndex = 0;
}
