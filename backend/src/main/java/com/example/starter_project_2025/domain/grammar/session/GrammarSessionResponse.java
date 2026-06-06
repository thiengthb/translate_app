package com.example.starter_project_2025.domain.grammar.session;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * A built study session plus the headline counts a "Continue Learning" dashboard
 * needs (how many reviews are due overall vs how many new units remain).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrammarSessionResponse {

    /** Ordered queue: due reviews first, then new units. */
    List<GrammarSessionItem> items;

    int reviewCount;        // reviews included in this session
    int newCount;           // new units included in this session

    int totalDue;           // ALL reviews currently due (>= reviewCount)
    int totalNewAvailable;  // ALL eligible new units not yet started
}
