package com.example.starter_project_2025.system.dictionary.notebook;

public interface NotebookService {

    NotebookResponse getNotebook(Long userId);

    NotebookResponse.WordEntry saveWord(Long userId, Long wordId);

    void removeWord(Long userId, Long wordId);

    NotebookResponse.KanjiEntry saveKanji(Long userId, String character);

    void removeKanji(Long userId, String character);

    void updateNote(Long userId, Long entryId, String note);

    void clearAll(Long userId);

    NotebookResponse sync(Long userId, NotebookSyncRequest request);
}