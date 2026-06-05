package com.example.starter_project_2025.domain.production.vocab;

import lombok.Getter;
import lombok.Setter;

/**
 * Describes where the vocabulary for a generated prompt should come from.
 * Phase 1 supports a JLPT level or a specific deck.
 */
@Getter
@Setter
public class VocabSource {

    /** "LEVEL" or "DECK". */
    private String type;

    /** JLPT code (e.g. "N5") — used when {@code type == "LEVEL"}. */
    private String level;

    /** Deck id — used when {@code type == "DECK"}. */
    private Long deckId;
}
