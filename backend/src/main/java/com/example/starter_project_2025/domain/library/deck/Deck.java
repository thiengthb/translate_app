package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardTemplate;
import com.example.starter_project_2025.domain.library.folder.Folder;
import com.example.starter_project_2025.domain.library.tag.Tag;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "decks")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("DECK")
@EntityLabel(name = "Deck", plural = "Decks", description = "Study deck management")
@AutoCrud(path = "decks")
@Searchable(fields = {"title", "description"})
@Filterable(fields = {"title", "visibility", "studyMode", "isActive"})
@Sortable(fields = {"title", "createdAt", "updatedAt", "cloneCount", "favoriteCount", "viewCount", "totalCards"})
@SoftDelete
@AuditEnabled
public class Deck extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    Folder folder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_deck_id")
    Deck originalDeck;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "deck_tags",
            joinColumns = @JoinColumn(name = "deck_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    Set<Tag> tags = new HashSet<>();

    @Column(nullable = false, length = 200)
    @FieldMeta(label = "Title", type = "text", required = true, order = 1, placeholder = "Enter deck title", group = "Basic Info")
    String title;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Description", type = "textarea", order = 2, placeholder = "Enter description", group = "Basic Info")
    String description;

    @Builder.Default
    @Column(length = 20)
    String visibility = "PRIVATE";

    @Builder.Default
    @Column(name = "study_mode", nullable = false, length = 20)
    @FieldMeta(label = "Study Mode", type = "select", order = 3, group = "Study", placeholder = "QUIZLET or ANKI")
    String studyMode = "QUIZLET";

    @Column
    String coverImageUrl;

    @Column(length = 10)
    String sourceLanguage;

    @Column(length = 10)
    String targetLanguage;

    @Builder.Default
    @Column(nullable = false)
    int totalCards = 0;

    /* ── Community counters (denormalized so we can sort by them) ── */
    @Builder.Default
    @Column(name = "clone_count", nullable = false, columnDefinition = "INT NOT NULL DEFAULT 0")
    int cloneCount = 0;

    @Builder.Default
    @Column(name = "favorite_count", nullable = false, columnDefinition = "INT NOT NULL DEFAULT 0")
    int favoriteCount = 0;

    @Builder.Default
    @Column(name = "view_count", nullable = false, columnDefinition = "INT NOT NULL DEFAULT 0")
    int viewCount = 0;

    @Column(name = "template_id")
    Long templateId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", insertable = false, updatable = false)
    FlashcardTemplate template;
}
