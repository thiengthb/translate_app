package com.example.starter_project_2025.domain.kanji_study.stroke_order;

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
 * Stroke-order animation data for a kanji (e.g. ordered SVG paths, KanjiVG-style).
 * One row per kanji. {@code strokeData} holds the ordered path JSON as text.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_stroke_orders")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_STROKE_ORDER")
@ResourceMenu(
        title = "Kanji Stroke Orders",
        group = "Kanji Study",
        icon = "pen-tool",
        url = "/kanji-stroke-orders",
        order = 1,
        permission = "KANJI_STROKE_ORDER_READ"
)
@EntityLabel(name = "Kanji Stroke Order", plural = "Kanji Stroke Orders", description = "Stroke-order animation data for a kanji")
@AutoCrud(path = "kanji-stroke-orders")
@Searchable(fields = {"source"})
@Filterable(fields = {"source", "isActive"})
@Sortable(fields = {"strokeCount", "createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiStrokeOrder extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false, unique = true)
    Kanji kanji;

    @Column(name = "stroke_count")
    @FieldMeta(label = "Stroke Count", type = "number", order = 1, group = "Stroke")
    Integer strokeCount;

    @Column(name = "stroke_data", columnDefinition = "LONGTEXT")
    @FieldMeta(label = "Stroke Data (JSON)", type = "textarea", order = 2,
               placeholder = "Ordered SVG path data as JSON", group = "Stroke")
    String strokeData;

    @Column(name = "svg_viewbox", length = 64)
    @FieldMeta(label = "SVG ViewBox", type = "text", order = 3, group = "Stroke")
    String svgViewbox;

    @Column(name = "source", length = 64)
    @FieldMeta(label = "Source", type = "text", order = 4, placeholder = "e.g. kanjivg", group = "Stroke")
    String source;
}
