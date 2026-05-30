package com.example.starter_project_2025.domain.classroom.classroom;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
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
@Table(name = "classes")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("CLASSROOM")
@ResourceMenu(
        title = "Classrooms",
        group = "Classroom",
        icon = "graduation-cap",
        url = "/classrooms",
        order = 1,
        permission = "CLASSROOM_READ"
)
@EntityLabel(name = "Classroom", plural = "Classrooms", description = "Class / group management")
@AutoCrud(path = "classrooms")
@Searchable(fields = {"name", "description"})
@Filterable(fields = {"isActive", "visibility"})
@Sortable(fields = {"name", "createdAt"})
@SoftDelete
@AuditEnabled
public class Classroom extends BaseEntity {

    @Column(name = "owner_id", nullable = false)
    Long ownerId;

    @Column(nullable = false, length = 200)
    String name;

    @Column(columnDefinition = "TEXT")
    String description;

    @Column(name = "invite_code", nullable = false, length = 20, unique = true)
    String inviteCode;

    @Column(name = "cover_image_url")
    String coverImageUrl;

    @Column(name = "max_members")
    Integer maxMembers;

    /**
     * PUBLIC  → listed in "Public classes"; anyone can self-join.
     * PRIVATE → not listed; viewable by link/id, join only via invite code.
     */
    @Builder.Default
    @Column(nullable = false, length = 20)
    String visibility = "PRIVATE";
}
