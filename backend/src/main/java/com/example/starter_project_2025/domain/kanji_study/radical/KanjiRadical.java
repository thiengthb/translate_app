package com.example.starter_project_2025.domain.kanji_study.radical;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * A Kangxi radical (bộ thủ) — the classifying component of a kanji (NOT stroke order).
 * Standalone reference list (214 entries); a {@link com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail}
 * points to its radical. Owned entirely by Kanji Study.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_radicals")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_RADICAL")
@ResourceMenu(
        title = "Bộ thủ",
        group = "Kanji Study",
        icon = "grid",
        url = "/kanji-radicals",
        order = 1,
        permission = "KANJI_RADICAL_READ"
)
@EntityLabel(name = "Kanji Radical", plural = "Kanji Radicals", description = "Kangxi radical (bộ thủ)")
@AutoCrud(path = "kanji-radicals")
@Searchable(fields = {"character", "hanViet", "meaning"})
@Filterable(fields = {"isActive"})
@Sortable(fields = {"number", "strokeCount", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiRadical extends BaseEntity {

    @Column(name = "number", unique = true)
    @FieldMeta(label = "Number", type = "number", order = 1, placeholder = "Kangxi number 1–214", group = "Radical")
    Integer number;

    @Column(name = "radical_char", nullable = false, length = 16)
    @FieldMeta(label = "Character", type = "text", required = true, order = 2, group = "Radical")
    String character;

    @Column(name = "han_viet", length = 64)
    @FieldMeta(label = "Hán-Việt", type = "text", order = 3, placeholder = "Tên bộ (thuỷ, mộc…)", group = "Radical")
    String hanViet;

    @Column(name = "meaning", columnDefinition = "TEXT")
    @FieldMeta(label = "Meaning", type = "textarea", order = 4, group = "Radical")
    String meaning;

    @Column(name = "stroke_count")
    @FieldMeta(label = "Stroke Count", type = "number", order = 5, group = "Radical")
    Integer strokeCount;
}
