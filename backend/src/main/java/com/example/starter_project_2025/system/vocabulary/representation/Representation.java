package com.example.starter_project_2025.system.vocabulary.representation;

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
@Table(name = "representations")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("REPRESENTATION")
@ResourceMenu(
        title = "Representations",
        group = "Vocabulary Management",
        icon = "representations",
        url = "/representations",
        order = 3,
        permission = "REPRESENTATION_READ"
)
@EntityLabel(name = "Representation", plural = "Representations", description = "Writing system representations (e.g. KANJI, HIRAGANA)")
@AutoCrud(path = "representations")
@Searchable(fields = {"code", "name"})
@Filterable(fields = {"code", "isActive"})
@Sortable(fields = {"code", "name", "createdAt", "updatedAt"})
@AuditEnabled
public class Representation extends BaseEntity {

    @Column(nullable = false)
    @FieldMeta(label = "Name", type = "text", required = true, order = 1,
               placeholder = "e.g. Kanji", group = "Basic Info")
    String name;

    @Column(unique = true, length = 30)
    @FieldMeta(label = "Code", type = "text", required = true, order = 2,
               placeholder = "e.g. KANJI, HIRAGANA, KATAKANA, ROMAJI", group = "Basic Info",
               description = "Unique identifier for this writing system")
    String code;
}
