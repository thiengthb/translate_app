package com.example.starter_project_2025.system.menu.module;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.base.dataio.exporter.annotation.ExportEntity;
import com.example.starter_project_2025.base.dataio.template.annotation.ImportEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.menu.module_groups.ModuleGroup;
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
@Table(name = "modules")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ImportEntity("module")
@ExportEntity(fileName = "modules", sheetName = "Modules")
@ResourcePermission("MENU")
@ResourceMenu(
        title = "Modules",
        group = "System",
        icon = "menus",
        url = "/menus",
        description = "Configure the navigation items shown in the sidebar.",
        order = 2,
        // Reads of menu metadata are needed by every authenticated user to
        // render the nav, so MENU_READ is granted broadly (see
        // RoleDataInitializer). Gating the management UI with MENU_UPDATE
        // keeps non-admin users out of the CRUD pages while still letting
        // them fetch their own nav data.
        permission = "MENU_UPDATE"
)
@Searchable(fields = {"title", "url", "description"})
@AutoCrud(path = "modules")
public class Module extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_group_id", nullable = false)
    ModuleGroup moduleGroup;

    @Column(nullable = false, length = 100)
    String title;

    @Column(length = 500)
    String url;

    @Column(length = 50)
    String icon;

    @Column(length = 500)
    String description;

    @Builder.Default
    @Column(nullable = false)
    Integer displayOrder = 0;

    @Column(length = 100)
    String requiredPermission;

    @Builder.Default
    @Column(nullable = false)
    Boolean isPublic = false;
}
