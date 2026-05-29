package com.example.starter_project_2025.domain.library.flashcard;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FlashcardRenderDTO {

    Long flashcardId;
    String frontHtml;
    String backHtml;
    String styling;
    Long templateId;
}
