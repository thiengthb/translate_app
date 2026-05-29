package com.example.starter_project_2025.domain.library.folder;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
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
@Table(name = "folders")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("FOLDER")
@ResourceMenu(
        title = "Folders",
        group = "Library",
        icon = "folder",
        url = "/folders",
        order = 1,
        permission = "FOLDER_READ"
)
@EntityLabel(name = "Folder", plural = "Folders", description = "User folder management")
@AutoCrud(path = "folders")
@Searchable(fields = {"name", "description"})
@Filterable(fields = {"name", "isActive"})
@Sortable(fields = {"name", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class Folder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(nullable = false, length = 100)
    @FieldMeta(label = "Folder Name", type = "text", required = true, order = 1,
               placeholder = "Enter folder name", group = "Basic Info")
    String name;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Description", type = "textarea", order = 2,
               placeholder = "Enter description", group = "Basic Info")
    String description;
}
