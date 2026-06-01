package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FlashcardTemplateDTO extends BaseDTO {

    Long userId;

    /** Non-null = deck-local copy (hidden from library); null = shared master. */
    Long deckId;

    String cardType;

    @NotBlank(groups = OnCreate.class, message = "Template name is required")
    String name;

    String description;

    String frontTemplate;

    String backTemplate;

    String styling;

    String builderConfigJson;

    Boolean isSystem;

    Boolean isDefault;

    /** PUBLIC = shareable to community, PRIVATE = owner-only. */
    String visibility;
}
