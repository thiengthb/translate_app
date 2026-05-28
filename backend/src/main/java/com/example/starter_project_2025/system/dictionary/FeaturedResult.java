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
public class FeaturedResult {
    List<WordSearchResult> words;
    List<KanjiSearchResult> kanjis;
}