package com.example.starter_project_2025.domain.library.deck;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeckDTO extends BaseDTO {

    Long userId;

    Long folderId;

    Long originalDeckId;

    Set<Long> tagIds;

    @NotBlank(groups = OnCreate.class, message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    String title;

    String description;

    String visibility;

    String studyMode;

    String coverImageUrl;

    String sourceLanguage;

    String targetLanguage;

    Integer totalCards;
}
