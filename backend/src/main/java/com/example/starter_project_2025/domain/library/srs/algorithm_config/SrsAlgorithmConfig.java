package com.example.starter_project_2025.domain.library.srs.algorithm_config;

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
@Table(name = "srs_algorithm_configs", uniqueConstraints = @UniqueConstraint(columnNames = "code"))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("SRS_ALGORITHM_CONFIG")
@ResourceMenu(
        title = "Algorithm Configs",
        group = "Anki SRS",
        icon = "cpu",
        url = "/anki/algorithm-configs",
        order = 5,
        permission = "SRS_ALGORITHM_CONFIG_READ"
)
@EntityLabel(name = "Algorithm Config", plural = "Algorithm Configs", description = "SRS algorithm configurations")
@AutoCrud(path = "anki/algorithm-configs")
@Searchable(fields = {"code", "name"})
@Filterable(fields = {"algorithmType", "enabled", "isActive"})
@Sortable(fields = {"code", "name", "createdAt"})
@AuditEnabled
public class SrsAlgorithmConfig extends BaseEntity {

    @Column(nullable = false, length = 100)
    @FieldMeta(label = "Code", type = "text", required = true, order = 1, group = "Basic Info")
    String code;

    @Column(nullable = false, length = 255)
    @FieldMeta(label = "Name", type = "text", required = true, order = 2, group = "Basic Info")
    String name;

    @Column(nullable = false, length = 50)
    @FieldMeta(label = "Algorithm Type", type = "text", required = true, order = 3, group = "Basic Info",
               placeholder = "SM2 / FSRS / CUSTOM")
    String algorithmType;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Config JSON", type = "textarea", order = 4, group = "Configuration")
    String configJson;

    @Builder.Default
    @Column(nullable = false)
    Boolean enabled = true;
}
