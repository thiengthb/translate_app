package com.example.starter_project_2025.domain.kanji_study.reading;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Extra readings a kanji has beyond on'yomi/kun'yomi (which live on the shared {@link Kanji}):
 * Hán-Việt (Sino-Vietnamese) and nanori (name readings). Many rows per kanji.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_readings")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_READING")
@ResourceMenu(
        title = "Kanji Readings",
        group = "Kanji Study",
        icon = "volume-2",
        url = "/kanji-readings",
        order = 2,
        permission = "KANJI_READING_READ"
)
@EntityLabel(name = "Kanji Reading", plural = "Kanji Readings", description = "Hán-Việt / nanori readings of a kanji")
@AutoCrud(path = "kanji-readings")
@Searchable(fields = {"value"})
@Filterable(fields = {"readingType", "isActive"})
@Sortable(fields = {"readingType", "priority", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiReading extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false)
    Kanji kanji;

    @Column(name = "reading_type", nullable = false, length = 16)
    @FieldMeta(label = "Reading Type", type = "select", required = true, order = 1,
               placeholder = "HAN_VIET or NANORI", group = "Reading")
    String readingType;

    @Column(name = "value", nullable = false, length = 128)
    @FieldMeta(label = "Value", type = "text", required = true, order = 2,
               placeholder = "Enter the reading", group = "Reading")
    String value;

    @Builder.Default
    @Column(name = "priority", nullable = false)
    int priority = 0;
}
