package com.example.starter_project_2025.domain.kanji_study.detail_word;

import lombok.*;
import lombok.experimental.FieldDefaults;

/** One kanji of a word's "Chữ Hán (N)" breakdown on the word detail page. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiInWord {
    /** kanji_details id; null when the character isn't in the study set. */
    Long id;
    String character;
    String jlptLevel;
    String onyomi;
    String kunyomi;
    String meaning;
    /** Hán-Việt readings joined with ", " (from kanji_readings HAN_VIET rows). */
    String hanViet;
}
