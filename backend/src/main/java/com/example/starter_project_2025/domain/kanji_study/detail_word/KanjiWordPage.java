package com.example.starter_project_2025.domain.kanji_study.detail_word;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/** Paginated vocabulary slice for a kanji ("Từ vựng (N)"). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiWordPage {
    List<KanjiVocabWord> items;
    int page;
    int size;
    long totalItems;
    int totalPages;
}
