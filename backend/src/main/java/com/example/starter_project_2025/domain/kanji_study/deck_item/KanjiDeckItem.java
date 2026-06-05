package com.example.starter_project_2025.domain.kanji_study.deck_item;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.kanji_study.deck.KanjiDeck;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Membership of a {@link Kanji} in a {@link KanjiDeck}. Kanji referenced read-only.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_deck_items",
        uniqueConstraints = @UniqueConstraint(name = "uk_kanji_deck_item", columnNames = {"deck_id", "kanji_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_DECK_ITEM")
@EntityLabel(name = "Kanji Deck Item", plural = "Kanji Deck Items", description = "Kanji inside a kanji deck")
@AutoCrud(path = "kanji-deck-items")
@Filterable(fields = {"isActive"})
@Sortable(fields = {"orderIndex", "createdAt"})
@SoftDelete
@AuditEnabled
public class KanjiDeckItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    KanjiDeck deck;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false)
    KanjiDetail kanji;

    @Builder.Default
    @Column(name = "order_index", nullable = false)
    int orderIndex = 0;
}
