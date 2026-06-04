package com.example.starter_project_2025.domain.kanji_study.detail;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.radical.KanjiRadical;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * The self-contained kanji record owned by Kanji Study (NOT the Language dictionary).
 * Holds the character and all its info: readings, meaning, stroke order, radical, etymology.
 * Other kanji-study tables reference this entity, not the shared {@code system.words.kanji.Kanji}.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_details")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_DETAIL")
@ResourceMenu(
        title = "Hán tự",
        group = "Kanji Study",
        icon = "languages",
        url = "/kanji-details",
        order = 3,
        permission = "KANJI_DETAIL_READ"
)
@EntityLabel(name = "Kanji", plural = "Kanji", description = "Kanji character with readings, meaning, stroke order and radical")
@AutoCrud(path = "kanji-details")
@Searchable(fields = {"character", "meaning", "formExplanation"})
@Filterable(fields = {"jlptLevel", "isActive"})
@Sortable(fields = {"character", "strokeCount", "jlptLevel", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiDetail extends BaseEntity {

    @Column(name = "kanji_char", nullable = false, unique = true, length = 16)
    @FieldMeta(label = "Character", type = "text", required = true, order = 1, group = "Basic")
    String character;

    @Column(name = "onyomi", columnDefinition = "TEXT")
    @FieldMeta(label = "Onyomi", type = "text", order = 2, group = "Reading")
    String onyomi;

    @Column(name = "kunyomi", columnDefinition = "TEXT")
    @FieldMeta(label = "Kunyomi", type = "text", order = 3, group = "Reading")
    String kunyomi;

    @Column(name = "meaning", columnDefinition = "TEXT")
    @FieldMeta(label = "Meaning", type = "textarea", order = 4, group = "Basic")
    String meaning;

    @Column(name = "jlpt_level", length = 8)
    @FieldMeta(label = "JLPT Level", type = "text", order = 5, group = "Basic")
    String jlptLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "radical_id")
    KanjiRadical radical;

    @Column(name = "stroke_count")
    @FieldMeta(label = "Stroke Count", type = "number", order = 6, group = "Stroke")
    Integer strokeCount;

    @Column(name = "stroke_data", columnDefinition = "LONGTEXT")
    @FieldMeta(label = "Stroke Data (JSON)", type = "textarea", order = 7,
               placeholder = "Ordered SVG path data as JSON (KanjiVG)", group = "Stroke")
    String strokeData;

    @Column(name = "svg_viewbox", length = 64)
    @FieldMeta(label = "SVG ViewBox", type = "text", order = 8, group = "Stroke")
    String svgViewbox;

    @Column(name = "stroke_source", length = 64)
    @FieldMeta(label = "Stroke Source", type = "text", order = 9, placeholder = "e.g. kanjivg", group = "Stroke")
    String strokeSource;

    @Column(name = "form_explanation", columnDefinition = "TEXT")
    @FieldMeta(label = "Form Explanation", type = "textarea", order = 10,
               placeholder = "Explain the kanji's structure/form", group = "Detail")
    String formExplanation;

    @Column(name = "etymology", columnDefinition = "TEXT")
    @FieldMeta(label = "Etymology", type = "textarea", order = 11,
               placeholder = "Origin/etymology of the kanji", group = "Detail")
    String etymology;
}
