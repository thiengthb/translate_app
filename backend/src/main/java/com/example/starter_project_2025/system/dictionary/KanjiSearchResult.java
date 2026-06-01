package com.example.starter_project_2025.system.dictionary;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class KanjiSearchResult {

    String character;
    String meaning;
    String onyomi;
    String kunyomi;
    Integer stroke;
    String radical;
    String jlptLevel;
    List<WordInfo> words;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class WordInfo {
        String word;
        String reading;
        String meaningText;
    }
}