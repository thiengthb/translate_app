package com.example.starter_project_2025.domain.library.deck_item;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeckItemDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class)
    Long deckId;

    @NotNull(groups = OnCreate.class)
    Long flashcardId;

    Integer orderIndex;
}
