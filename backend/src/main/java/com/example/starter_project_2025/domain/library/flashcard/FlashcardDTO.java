package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Map;

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

    String cardType;
    String itemType;
    String hint;
    String explanation;

    /** Derived from FRONT/BACK sides for display compatibility. */
    String front;
    String back;

    /** First non-deleted IMAGE URL across all sides (derived, read-only). */
    String imageUrl;

    /** First non-deleted AUDIO URL across all sides (derived, read-only). */
    String audioUrl;

    @Valid
    List<SideDTO> sides;

    /* ─────────────────────────────────────────
       Nested DTO · FlashcardSide
    ───────────────────────────────────────── */
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class SideDTO {

        Long id;

        @NotNull(groups = OnCreate.class, message = "Side type is required")
        SideType side;

        @Valid
        List<ContentDTO> contents;
    }

    /* ─────────────────────────────────────────
       Nested DTO · FlashcardSideContent
    ───────────────────────────────────────── */
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ContentDTO {

        Long id;

        @NotNull(message = "Content type is required")
        ContentType contentType;

        @NotBlank(message = "Content value is required")
        String contentValue;

        int orderIndex;

        Map<String, Object> metadata;
    }
}
