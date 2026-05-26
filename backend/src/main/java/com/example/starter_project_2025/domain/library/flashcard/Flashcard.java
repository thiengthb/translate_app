package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
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
@Table(name = "flashcards")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("FLASHCARD")
@ResourceMenu(
        title = "Flashcards",
        group = "Library",
        icon = "cards",
        url = "/flashcards",
        order = 4,
        permission = "FLASHCARD_READ"
)
@EntityLabel(name = "Flashcard", plural = "Flashcards", description = "Flashcard management")
@AutoCrud(path = "flashcards")
@Searchable(fields = {"front", "back", "hint"})
@Filterable(fields = {"cardType", "itemType", "isActive"})
@Sortable(fields = {"createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class Flashcard extends BaseEntity {

    @Column(name = "word_id")
    Long wordId;

    @Builder.Default
    @Column(nullable = false, length = 50)
    String cardType = "BASIC";

    @Builder.Default
    @Column(nullable = false, length = 50)
    String itemType = "WORD";

    @Column(nullable = false)
    Long itemId;

    @Column(nullable = false, columnDefinition = "TEXT")
    @FieldMeta(label = "Front", type = "textarea", required = true, order = 1,
               placeholder = "Enter front content", group = "Basic Info")
    String front;

    @Column(nullable = false, columnDefinition = "TEXT")
    @FieldMeta(label = "Back", type = "textarea", required = true, order = 2,
               placeholder = "Enter back content", group = "Basic Info")
    String back;

    @Column
    String imageUrl;

    @Column
    String audioUrl;

    @Column(columnDefinition = "TEXT")
    String hint;

    @Column(columnDefinition = "TEXT")
    String explanation;
}
