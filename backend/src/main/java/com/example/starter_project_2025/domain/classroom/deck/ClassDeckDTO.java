package com.example.starter_project_2025.domain.classroom.deck;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClassDeckDTO extends BaseDTO {

    Long classroomId;
    Long deckId;
    Long addedBy;
    LocalDateTime addedAt;

    /** Enriched from the Deck record. */
    String deckTitle;
}
