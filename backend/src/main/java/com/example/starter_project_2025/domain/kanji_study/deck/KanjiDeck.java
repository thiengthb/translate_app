package com.example.starter_project_2025.domain.kanji_study.deck;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * A Kanji study deck — the user's OWN study system, separate from domain/library decks
 * (flashcard/quizlet/anki). user is null for built-in/system decks.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kanji_decks")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("KANJI_DECK")
@ResourceMenu(
        title = "Kanji Decks",
        group = "Kanji Study",
        icon = "layers",
        url = "/kanji-decks",
        order = 4,
        permission = "KANJI_DECK_READ"
)
@EntityLabel(name = "Kanji Deck", plural = "Kanji Decks", description = "Kanji study deck")
@AutoCrud(path = "kanji-decks")
@Searchable(fields = {"title", "description"})
@Filterable(fields = {"visibility", "isSystem", "jlptLevel", "isActive"})
@Sortable(fields = {"title", "createdAt", "updatedAt", "totalKanji"})
@SoftDelete
@AuditEnabled
public class KanjiDeck extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    User user;

    @Column(nullable = false, length = 200)
    @FieldMeta(label = "Title", type = "text", required = true, order = 1,
               placeholder = "Enter deck title", group = "Basic Info")
    String title;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Description", type = "textarea", order = 2,
               placeholder = "Enter description", group = "Basic Info")
    String description;

    @Builder.Default
    @Column(length = 20)
    String visibility = "PRIVATE";

    @Builder.Default
    @Column(name = "is_system")
    Boolean isSystem = false;

    @Column(name = "jlpt_level", length = 8)
    String jlptLevel;

    @Column(name = "cover_image_url")
    String coverImageUrl;

    @Builder.Default
    @Column(name = "total_kanji", nullable = false)
    int totalKanji = 0;
}
