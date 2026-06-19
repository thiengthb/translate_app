package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.word.Word;

import java.util.List;

public interface DictionaryService {
    List<WordSearchResult> search(String query, int limit);
    WordSearchResult getById(Long id);
    List<WordSuggestion> suggest(String query, int limit);
    List<KanjiSearchResult> searchKanji(String query, int limit);
    FeaturedResult featured(int wordLimit, int kanjiLimit);
    BrowseResult<WordSearchResult> browseWords(String level, int page, int size);
    BrowseResult<KanjiSearchResult> browseKanjis(String level, int page, int size);

    // ── Mapper dùng chung (Notebook tái sử dụng để trả cùng shape với search) ──
    WordSearchResult toWordResult(Word word);
    KanjiSearchResult toKanjiResult(Kanji kanji);
}