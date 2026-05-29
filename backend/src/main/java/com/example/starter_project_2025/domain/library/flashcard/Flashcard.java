package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

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
@Searchable(fields = {"hint", "explanation"})
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

    /* Legacy columns kept for DB backward compatibility (NOT NULL, no default).
       New content is stored in FlashcardSide / FlashcardSideContent. */
    @Builder.Default
    @Column(columnDefinition = "TEXT")
    String front = "";

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    String back = "";

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Hint", type = "textarea", order = 1,
               placeholder = "Optional hint", group = "Basic Info")
    String hint;

    @Column(columnDefinition = "TEXT")
    @FieldMeta(label = "Explanation", type = "textarea", order = 2,
               placeholder = "Optional explanation", group = "Basic Info")
    String explanation;

    @Builder.Default
    @OneToMany(mappedBy = "flashcard", cascade = CascadeType.ALL, orphanRemoval = true)
    List<FlashcardSide> sides = new ArrayList<>();
}
