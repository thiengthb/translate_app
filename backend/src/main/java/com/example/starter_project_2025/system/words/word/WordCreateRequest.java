package com.example.starter_project_2025.system.words.word;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Yêu cầu tạo từ vựng "gộp": tạo từ + nhiều nghĩa (đa ngôn ngữ) + nhiều ví dụ
 * trong một transaction. Dùng cho endpoint POST /api/words/full.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WordCreateRequest {

    @NotBlank(message = "Word is required")
    String word;

    String reading;
    String wordType;
    Integer frequency;

    @NotNull(message = "Representation is required")
    Long representationId;

    @NotNull(message = "Level is required")
    Long levelId;

    @Valid
    @NotEmpty(message = "At least one meaning is required")
    List<MeaningInput> meanings;

    @Valid
    List<ExampleInput> examples;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class MeaningInput {

        @NotNull(message = "Language is required")
        Long languageId;

        @NotBlank(message = "Meaning is required")
        String name;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ExampleInput {

        @NotNull(message = "Root language is required")
        Long rootLanguageId;

        @NotNull(message = "Target language is required")
        Long toLanguageId;

        @NotBlank(message = "Root example is required")
        String rootExample;

        String toExample;
    }
}