package com.example.starter_project_2025.base.i18n;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Storage for dynamic translations (admin-editable content like Module
 * titles, dashboard widget labels, email subject lines). Static UI strings
 * live in the FE catalogs under {@code frontend/src/i18n/messages}.
 *
 * Wiring this with {@code @AutoCrud + @ResourceMenu} gives the framework
 * everything it needs to expose a full CRUD UI under "System Management"
 * for admins.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "translations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"locale", "messageKey"})
)
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("TRANSLATION")
@ResourceMenu(
        title = "Translations",
        group = "System",
        icon = "globe",
        url = "/translations",
        description = "Manage UI text for each supported language.",
        order = 3,
        permission = "TRANSLATION_READ"
)
@Searchable(fields = {"messageKey", "messageValue", "category"})
@AutoCrud(path = "translations")
public class Translation extends BaseEntity {

    @Column(nullable = false, length = 10)
    String locale;

    @Column(nullable = false, length = 200)
    String messageKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    String messageValue;

    @Column(length = 100)
    String category;
}
