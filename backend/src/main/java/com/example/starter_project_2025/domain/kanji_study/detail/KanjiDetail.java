package com.example.starter_project_2025.domain.kanji_study.detail;

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
 * Extra descriptive info for a Kanji that the shared dictionary entity does not carry
 * (structural/form explanation, etymology). One row per kanji.
 * References {@link Kanji} read-only — the kanji feature owns this table, not the dictionary.
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
        title = "Kanji Details",
        group = "Kanji Study",
        icon = "info",
        url = "/kanji-details",
        order = 3,
        permission = "KANJI_DETAIL_READ"
)
@EntityLabel(name = "Kanji Detail", plural = "Kanji Details", description = "Extra form/etymology info for a kanji")
@AutoCrud(path = "kanji-details")
@Searchable(fields = {"formExplanation", "etymology"})
@Filterable(fields = {"isActive"})
@Sortable(fields = {"createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class KanjiDetail extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false, unique = true)
    Kanji kanji;

    @Column(name = "form_explanation", columnDefinition = "TEXT")
    @FieldMeta(label = "Form Explanation", type = "textarea", order = 1,
               placeholder = "Explain the kanji's structure/form", group = "Detail")
    String formExplanation;

    @Column(name = "etymology", columnDefinition = "TEXT")
    @FieldMeta(label = "Etymology", type = "textarea", order = 2,
               placeholder = "Origin/etymology of the kanji", group = "Detail")
    String etymology;
}
