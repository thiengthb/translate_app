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
@Filterable(fields = {"cardType", "isSystem", "isDefault"})
@AutoCrud(path = "flashcard-templates")
@SoftDelete
public class FlashcardTemplate extends BaseEntity {

    @Column(name = "user_id")
    Long userId;

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

    @Builder.Default
    @Column(name = "is_system", nullable = false)
    boolean isSystem = false;

    @Builder.Default
    @Column(name = "is_default", nullable = false)
    boolean isDefault = false;
}
