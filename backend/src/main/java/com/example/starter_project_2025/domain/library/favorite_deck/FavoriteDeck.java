package com.example.starter_project_2025.domain.library.favorite_deck;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
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
@Table(name = "favorite_decks", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "deck_id"}))
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("FAVORITE_DECK")
@EntityLabel(name = "Favorite Deck", plural = "Favorite Decks", description = "User favorite deck management")
@AutoCrud(path = "favorite-decks")
@Filterable(fields = {"isActive"})
@Sortable(fields = {"createdAt"})
@AuditEnabled
public class FavoriteDeck extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    Deck deck;
}
