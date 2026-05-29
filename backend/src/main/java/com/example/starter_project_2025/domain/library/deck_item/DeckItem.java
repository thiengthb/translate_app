package com.example.starter_project_2025.domain.library.deck_item;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
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
@Table(name = "deck_items", uniqueConstraints = @UniqueConstraint(columnNames = {"deck_id", "flashcard_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("DECK_ITEM")
@ResourceMenu(
        title = "Deck Items",
        group = "Library",
        icon = "list",
        url = "/deck-items",
        order = 5,
        permission = "DECK_ITEM_READ"
)
@EntityLabel(name = "Deck Item", plural = "Deck Items", description = "Flashcard to deck mapping")
@AutoCrud(path = "deck-items")
@Filterable(fields = {"isActive"})
@Sortable(fields = {"orderIndex", "createdAt"})
@AuditEnabled
public class DeckItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    Deck deck;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    Flashcard flashcard;

    @Builder.Default
    @Column(nullable = false)
    int orderIndex = 0;
}
