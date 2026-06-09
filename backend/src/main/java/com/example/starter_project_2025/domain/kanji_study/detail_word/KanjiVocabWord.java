package com.example.starter_project_2025.domain.kanji_study.detail_word;

import lombok.*;
import lombok.experimental.FieldDefaults;

/** A vocabulary word as shown in the kanji detail page's word sections. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiVocabWord {
    Long id;
    String word;
    String reading;
    String wordType;
    Integer frequency;
    String meaningText;
    String levelCode;
    String levelName;
}
