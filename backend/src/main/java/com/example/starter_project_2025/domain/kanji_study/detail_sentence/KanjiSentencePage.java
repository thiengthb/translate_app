package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/** Paginated example-sentence slice for a kanji ("Câu (N)"). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiSentencePage {
    List<KanjiSentenceItem> items;
    int page;
    int size;
    long totalItems;
    int totalPages;
}
