package com.example.starter_project_2025.domain.kanji_study.deck_item;

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
public class KanjiDeckItemDTO extends BaseDTO {

    @NotNull(groups = OnCreate.class, message = "Deck ID is required")
    Long deckId;

    @NotNull(groups = OnCreate.class, message = "Kanji ID is required")
    Long kanjiId;

    Integer orderIndex;
}
