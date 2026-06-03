package com.example.starter_project_2025.domain.kanji_study.reading_set;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * A graded reading set (KLC-style) — an ordered collection of reading passages for the
 * "reading" study mode. The kanji feature's own content, separate from co-worker features.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_reading_sets")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_READING_SET")
@ResourceMenu(
        title = "Kanji Reading Sets",
        group = "Kanji Study",
        icon = "book-open-text",
        url = "/kanji-reading-sets",
        order = 5,
        permission = "KANJI_READING_SET_READ"
)
@EntityLabel(name = "Kanji Reading Set", plural = "Kanji Reading Sets", description = "Graded reading set")
@AutoCrud(path = "kanji-reading-sets")
@Searchable(fields = {"title", "description"})
@Filterable(fields = {"level", "isActive"})
@Sortable(fields = {"title", "orderIndex", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiReadingSet extends BaseEntity {

    @Column(nullable = false, length = 255)
    @FieldMeta(label = "Title", type = "text", required = true, order = 1,
               placeholder = "Enter reading set title", group = "Basic Info")
    String title;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Description", type = "textarea", order = 2, group = "Basic Info")
    String description;

    @Column(name = "level", length = 32)
    @FieldMeta(label = "Level", type = "text", order = 3, group = "Basic Info")
    String level;

    @Builder.Default
    @Column(name = "order_index", nullable = false)
    int orderIndex = 0;
}
