package com.example.starter_project_2025.domain.grammar.session;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/** One unit to study in a "Continue Learning" session. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrammarSessionItem {

    Long subUseId;
    String name;
    String jlptLevel;

    /** NEW (never studied) or REVIEW (due for spaced repetition). */
    String kind;

    // SRS snapshot (null for NEW items)
    String state;
    Integer intervalDays;
    Integer reviewCount;
    LocalDateTime nextReviewAt;
}
