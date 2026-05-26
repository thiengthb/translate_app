package com.example.starter_project_2025.system.vocabulary.language;

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
@Table(name = "languages")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("LANGUAGE")
@ResourceMenu(
        title = "Languages",
        group = "Vocabulary Management",
        icon = "languages",
        url = "/languages",
        order = 1,
        permission = "LANGUAGE_READ"
)
@EntityLabel(name = "Language", plural = "Languages", description = "Supported languages in the system")
@AutoCrud(path = "languages")
@Searchable(fields = {"code", "name"})
@Filterable(fields = {"code", "isActive"})
@Sortable(fields = {"code", "name", "createdAt", "updatedAt"})
@AuditEnabled
public class Language extends BaseEntity {

    @Column(unique = true, nullable = false, length = 10)
    @FieldMeta(label = "Code", type = "text", required = true, order = 1,
               placeholder = "e.g. ja, vi, en", group = "Basic Info",
               description = "ISO language code (e.g. ja, vi, en)")
    String code;

    @Column(nullable = false)
    @FieldMeta(label = "Name", type = "text", required = true, order = 2,
               placeholder = "e.g. Japanese", group = "Basic Info")
    String name;
}
