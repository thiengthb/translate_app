package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FlashcardDTO extends BaseDTO {

    Long wordId;

    @NotNull(groups = OnCreate.class, message = "Item ID is required")
    Long itemId;

    @NotBlank(groups = OnCreate.class, message = "Front content is required")
    String front;

    @NotBlank(groups = OnCreate.class, message = "Back content is required")
    String back;

    String cardType;
    String itemType;
    String imageUrl;
    String audioUrl;
    String hint;
    String explanation;
}
