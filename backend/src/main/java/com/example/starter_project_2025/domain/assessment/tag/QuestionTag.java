package com.example.starter_project_2025.domain.assessment.tag;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * A reusable label attached to questions for filtering / grouping
 * (e.g. "te-form", "n5-grammar", "irregular-verb").
 *
 * <p>{@code createdByUser == null} marks a system tag (seeded / shared by all);
 * a non-null value is the user who created it.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "question_tags",
        uniqueConstraints = @UniqueConstraint(columnNames = {"created_by_user", "code"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUESTION_TAG")
@ResourceMenu(
        title = "Question Tags",
        group = "Assessment",
        icon = "tag",
        url = "/question-tags",
        order = 3,
        permission = "QUESTION_TAG_READ"
)
@EntityLabel(name = "Question Tag", plural = "Question Tags", description = "Tags for filtering questions")
@AutoCrud(path = "question-tags")
@Searchable(fields = {"name", "code"})
@Filterable(fields = {"name", "code", "isActive"})
@Sortable(fields = {"name", "code", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class QuestionTag extends BaseEntity {

    @Column(nullable = false, length = 150)
    @FieldMeta(label = "Name", type = "text", required = true, order = 1,
               placeholder = "e.g. te-form", group = "Basic Info")
    String name;

    // Unique per owner — see the table-level (created_by_user, code) constraint.
    @Column(length = 150)
    @FieldMeta(label = "Code", type = "text", order = 2,
               placeholder = "slug, e.g. te_form", group = "Basic Info")
    String code;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Description", type = "textarea", order = 3,
               placeholder = "Enter description", group = "Basic Info")
    String description;

    /** User who created the tag; {@code null} = system tag. */
    @Column(name = "created_by_user")
    Long createdByUser;
}
