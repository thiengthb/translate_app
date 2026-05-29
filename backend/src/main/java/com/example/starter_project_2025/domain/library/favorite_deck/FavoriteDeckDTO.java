package com.example.starter_project_2025.domain.library.favorite_deck;

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
public class FavoriteDeckDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "User ID is required")
    Long userId;

    @NotNull(groups = OnCreate.class, message = "Deck ID is required")
    Long deckId;
}
