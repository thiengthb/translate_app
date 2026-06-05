package com.example.starter_project_2025.system.dictionary.notebook;

import com.example.starter_project_2025.system.dictionary.KanjiSearchResult;
import com.example.starter_project_2025.system.dictionary.WordSearchResult;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

/** Toàn bộ sổ tay của user hiện hành: từ vựng + kanji đã lưu, kèm ghi chú. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotebookResponse {

    List<WordEntry>  words;
    List<KanjiEntry> kanjis;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class WordEntry {
        Long entryId;
        String note;
        LocalDateTime savedAt;
        WordSearchResult word;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class KanjiEntry {
        Long entryId;
        String note;
        LocalDateTime savedAt;
        KanjiSearchResult kanji;
    }
}