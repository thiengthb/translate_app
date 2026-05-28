package com.example.starter_project_2025.system.dictionary;

import java.util.List;

public interface DictionaryService {
    List<WordSearchResult> search(String query, int limit);
    List<WordSuggestion> suggest(String query, int limit);
    List<KanjiSearchResult> searchKanji(String query, int limit);
}