package com.example.starter_project_2025.domain.kanji_study.detail_word;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * One pronunciation group for "Ví dụ phát âm": all vocabulary that uses a
 * particular reading of the kanji (e.g. サン → 三十, 三百, …).
 *
 * <p>Attribution is heuristic — a word is matched to a reading when its kana
 * reading contains that reading's stem (okurigana stripped, katakana folded to
 * hiragana). Words matching no reading land in the {@code OTHER} group.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiReadingGroup {

    /** Reading in display form (e.g. "サン", "み"); null for the OTHER bucket. */
    String reading;

    /** "ON" | "KUN" | "OTHER". */
    String readingType;

    /** Total words attributed to this reading (may exceed {@link #words} size). */
    long totalCount;

    /** Sample words, frequency-ordered, capped by the request. */
    List<KanjiVocabWord> words;
}
