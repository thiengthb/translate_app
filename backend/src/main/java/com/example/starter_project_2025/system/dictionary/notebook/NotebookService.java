package com.example.starter_project_2025.system.dictionary.notebook;

import java.util.List;

public interface NotebookService {

    // ── Quản lý sổ tay ─────────────────────────────────────────────────
    List<NotebookSummary> listNotebooks(Long userId);

    NotebookSummary createNotebook(Long userId, String name, String color);

    NotebookSummary updateNotebook(Long userId, Long notebookId, String name, String color);

    void deleteNotebook(Long userId, Long notebookId);

    // ── Mục trong một sổ tay cụ thể ────────────────────────────────────
    NotebookResponse getNotebookEntries(Long userId, Long notebookId);

    NotebookResponse.WordEntry addWord(Long userId, Long notebookId, Long wordId);

    void removeWord(Long userId, Long notebookId, Long wordId);

    NotebookResponse.KanjiEntry addKanji(Long userId, Long notebookId, String character);

    void removeKanji(Long userId, Long notebookId, String character);

    /** Id các sổ tay đang chứa từ/kanji (cho trạng thái picker). */
    List<Long> notebookIdsForWord(Long userId, Long wordId);

    List<Long> notebookIdsForKanji(Long userId, String character);

    // ── Tổng hợp / tương thích ngược (xuyên mọi sổ tay) ────────────────
    /** Toàn bộ mục đã lưu (gộp mọi sổ tay, loại trùng) — cho trạng thái bookmark. */
    NotebookResponse getNotebook(Long userId);

    /** Lưu nhanh vào sổ tay mặc định. */
    NotebookResponse.WordEntry saveWordToDefault(Long userId, Long wordId);

    NotebookResponse.KanjiEntry saveKanjiToDefault(Long userId, String character);

    /** Bỏ lưu khỏi MỌI sổ tay. */
    void removeWordEverywhere(Long userId, Long wordId);

    void removeKanjiEverywhere(Long userId, String character);

    void updateNote(Long userId, Long entryId, String note);

    /** Xóa toàn bộ mục đã lưu (giữ lại các sổ tay). */
    void clearAll(Long userId);

    /** Merge các mục lưu offline (localStorage) vào sổ tay mặc định. */
    NotebookResponse sync(Long userId, NotebookSyncRequest request);
}