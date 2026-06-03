package com.example.starter_project_2025.domain.library.tag;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
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
@Table(name = "tags")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("TAG")
@EntityLabel(name = "Tag", plural = "Tags", description = "User tag management")
@AutoCrud(path = "tags")
@Searchable(fields = {"name", "description"})
@Filterable(fields = {"name", "isActive"})
@Sortable(fields = {"name", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class Tag extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(nullable = false, length = 100)
    @FieldMeta(label = "Tag Name", type = "text", required = true, order = 1,
               placeholder = "Enter tag name", group = "Basic Info")
    String name;

    @Column(length = 7)
    @FieldMeta(label = "Color", type = "color", order = 2,
               placeholder = "#000000", group = "Basic Info")
    String color;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Description", type = "textarea", order = 3,
               placeholder = "Enter description", group = "Basic Info")
    String description;
}
