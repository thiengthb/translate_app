package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
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
@Table(
        name = "flashcard_templates",
        indexes = @Index(name = "idx_flashcard_template_user_card_type", columnList = "user_id, card_type")
)
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("FLASHCARD_TEMPLATE")
@Searchable(fields = {"name", "description"})
@Filterable(fields = {"cardType", "isSystem", "isDefault", "visibility", "userId", "deckId"})
@AutoCrud(path = "flashcard-templates")
@SoftDelete
public class FlashcardTemplate extends BaseEntity {

    @Column(name = "user_id")
    Long userId;

    /**
     * When non-null, this template is a DECK-LOCAL copy owned by that deck
     * (created when a deck's rendering is edited) and is hidden from the
     * reusable library. When null, it is a shared master / system template that
     * may be reused across decks — editing a deck that links to it must fork a
     * local copy instead of mutating the master.
     */
    @Column(name = "deck_id")
    Long deckId;

    @Column(name = "card_type", length = 50)
    String cardType;

    @Column(name = "name", nullable = false, length = 255)
    String name;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "front_template", columnDefinition = "TEXT")
    String frontTemplate;

    @Column(name = "back_template", columnDefinition = "TEXT")
    String backTemplate;

    @Column(name = "styling", columnDefinition = "TEXT")
    String styling;

    @Column(name = "builder_config_json", columnDefinition = "TEXT")
    String builderConfigJson;

    @Builder.Default
    @Column(name = "is_system", nullable = false)
    boolean isSystem = false;

    @Builder.Default
    @Column(name = "is_default", nullable = false)
    boolean isDefault = false;

    /** PUBLIC templates are shareable to the community; PRIVATE are owner-only. */
    @Builder.Default
    @Column(length = 20)
    String visibility = "PRIVATE";
}
