package com.example.starter_project_2025.system.vocabulary.level;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "levels")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("LEVEL")
@ResourceMenu(
        title = "Levels",
        group = "Vocabulary Management",
        icon = "levels",
        url = "/levels",
        order = 2,
        permission = "LEVEL_READ"
)
@EntityLabel(name = "Level", plural = "Levels", description = "Proficiency levels (e.g. N5, N4, N3, N2, N1)")
@AutoCrud(path = "levels")
@Searchable(fields = {"code", "name"})
@Filterable(fields = {"code", "isActive"})
@Sortable(fields = {"code", "name", "createdAt", "updatedAt"})
@AuditEnabled
public class Level extends BaseEntity {

    @Column(nullable = false)
    @FieldMeta(label = "Name", type = "text", required = true, order = 1,
               placeholder = "e.g. Beginner", group = "Basic Info")
    String name;

    @Column(unique = true, length = 20)
    @FieldMeta(label = "Code", type = "text", required = true, order = 2,
               placeholder = "e.g. N5, N4, N3", group = "Basic Info",
               description = "Short identifier for this level")
    String code;
}
