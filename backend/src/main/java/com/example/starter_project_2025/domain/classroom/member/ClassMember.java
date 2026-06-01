package com.example.starter_project_2025.domain.classroom.member;

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
@Table(name = "class_members", uniqueConstraints = @UniqueConstraint(columnNames = {"class_id", "user_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("CLASS_MEMBER")
@EntityLabel(name = "Class Member", plural = "Class Members", description = "Classroom membership")
@AutoCrud(path = "class-members")
@Filterable(fields = {"isActive"})
@Sortable(fields = {"joinedAt"})
@AuditEnabled
public class ClassMember extends BaseEntity {

    @Column(name = "class_id", nullable = false)
    Long classroomId;

    @Column(name = "user_id", nullable = false)
    Long userId;

    @Builder.Default
    @Column(length = 20, nullable = false)
    String role = "STUDENT";

    @Column(name = "joined_via", length = 20)
    String joinedVia;

    @Column(name = "joined_at", nullable = false)
    LocalDateTime joinedAt;
}
