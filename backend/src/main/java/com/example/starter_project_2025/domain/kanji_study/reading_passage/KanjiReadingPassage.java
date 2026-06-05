package com.example.starter_project_2025.domain.kanji_study.reading_passage;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.reading_set.KanjiReadingSet;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * A single reading passage inside a {@link KanjiReadingSet}.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_reading_passages")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_READING_PASSAGE")
@EntityLabel(name = "Kanji Reading Passage", plural = "Kanji Reading Passages", description = "A passage in a reading set")
@AutoCrud(path = "kanji-reading-passages")
@Searchable(fields = {"content", "translationVi"})
@Filterable(fields = {"isActive"})
@Sortable(fields = {"orderIndex", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiReadingPassage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "set_id", nullable = false)
    KanjiReadingSet readingSet;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    @FieldMeta(label = "Content (JP)", type = "textarea", required = true, order = 1, group = "Passage")
    String content;

    @Column(name = "furigana", columnDefinition = "LONGTEXT")
    @FieldMeta(label = "Furigana (JSON)", type = "textarea", order = 2, group = "Passage")
    String furigana;

    @Column(name = "translation_vi", columnDefinition = "TEXT")
    @FieldMeta(label = "Vietnamese Translation", type = "textarea", order = 3, group = "Passage")
    String translationVi;

    @Builder.Default
    @Column(name = "order_index", nullable = false)
    int orderIndex = 0;
}
