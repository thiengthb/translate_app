package com.example.starter_project_2025.system.vocabulary.meaning;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.vocabulary.language.Language;
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
@Table(name = "meanings")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("MEANING")
@ResourceMenu(
        title = "Meanings",
        group = "Vocabulary Management",
        icon = "meanings",
        url = "/meanings",
        order = 4,
        permission = "MEANING_READ"
)
@EntityLabel(name = "Meaning", plural = "Meanings", description = "Word meanings per language")
@AutoCrud(path = "meanings")
@Searchable(fields = {"name"})
@Filterable(fields = {"isActive"})
@Sortable(fields = {"name", "createdAt", "updatedAt"})
@AuditEnabled
public class Meaning extends BaseEntity {

    /**
     * The language this meaning is written in.
     * FK → languages.id (Long)
     * Note: the ERD defines this as UUID, but the shared BaseEntity uses Long PKs.
     * All teams referencing languages.id should use Long as the FK type.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "language_id", nullable = false)
    @FieldMeta(
            label = "Language",
            type = "relation",
            relation = "languages",
            relationDisplay = "name",
            required = true,
            order = 1,
            group = "Basic Info"
    )
    Language language;

    @Column(nullable = false, columnDefinition = "TEXT")
    @FieldMeta(label = "Meaning", type = "textarea", required = true, order = 2,
               placeholder = "Enter the meaning text", group = "Basic Info")
    String name;
}
