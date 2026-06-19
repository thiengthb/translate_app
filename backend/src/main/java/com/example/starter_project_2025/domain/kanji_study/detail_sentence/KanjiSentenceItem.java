package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import com.example.starter_project_2025.system.analyze.FuriganaSegment;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/** One example sentence as sent to the kanji detail page ("Câu"). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiSentenceItem {
    Long id;
    String japanese;
    List<FuriganaSegment> segments;
    String translationEn;
    String translationVi;
    String source;
}
