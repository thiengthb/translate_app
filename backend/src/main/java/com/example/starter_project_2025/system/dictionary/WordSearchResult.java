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
public class WordSearchResult {

    Long id;
    String word;
    String reading;
    String wordType;
    Integer frequency;

    String representationCode;
    String representationName;

    String meaningText;

    String levelCode;
    String levelName;

    List<KanjiInfo> kanjis;
    List<ExampleInfo> examples;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class KanjiInfo {
        String character;
        String onyomi;
        String kunyomi;
        String meaning;
        Integer stroke;
        String radical;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ExampleInfo {
        String rootExample;
        String toExample;
        String rootLanguageName;
        String toLanguageName;
    }
}