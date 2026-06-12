package com.example.starter_project_2025.domain.kanji_study.detail_word;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/** Full payload of the word detail page: the word + all meanings + its kanji breakdown. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiWordDetail {
    Long id;
    String word;
    String reading;
    String wordType;
    Integer frequency;
    String levelCode;
    String levelName;
    /** Every meaning text, Vietnamese first. */
    List<String> meanings;
    /** Kanji appearing in the word, in first-seen order. */
    List<KanjiInWord> kanji;
}
