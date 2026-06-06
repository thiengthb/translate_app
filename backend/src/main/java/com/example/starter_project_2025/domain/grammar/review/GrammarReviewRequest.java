package com.example.starter_project_2025.domain.grammar.review;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Submit a production answer AND advance its long-term SRS schedule in one call.
 * The grammar-learning ("Continue Learning") UI posts here instead of the raw
 * {@code /api/production/attempt} endpoint, so each graded attempt also moves
 * the spaced-repetition state forward.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrammarReviewRequest {

    @NotNull(message = "promptId is required")
    Long promptId;

    @NotBlank(message = "answer is required")
    String answer;
}
