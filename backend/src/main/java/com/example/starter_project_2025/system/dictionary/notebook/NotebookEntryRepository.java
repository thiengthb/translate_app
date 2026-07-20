package com.example.starter_project_2025.system.dictionary.notebook;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotebookEntryRepository extends JpaRepository<NotebookEntry, Long> {

    /**
     * Toàn bộ mục đã lưu của một user (mọi sổ tay), mới lưu trước. Fetch sẵn
     * notebook + word (+level, representation) + kanji để mapper không lazy-load
     * từng dòng. Mục trỏ tới từ/kanji đã bị xóa/tắt bị loại ngay tại query.
     */
    @Query("""
            SELECT e FROM NotebookEntry e
            JOIN FETCH e.notebook
            LEFT JOIN FETCH e.word w
            LEFT JOIN FETCH w.level
            LEFT JOIN FETCH w.representation
            LEFT JOIN FETCH e.kanji k
            WHERE e.user.id = :userId
            AND (w IS NULL OR (w.isDeleted = false AND w.isActive = true))
            AND (k IS NULL OR (k.isDeleted = false AND k.isActive = true))
            ORDER BY e.id DESC
            """)
    List<NotebookEntry> findAllForUser(@Param("userId") Long userId);

    /** Như findAllForUser nhưng giới hạn trong một sổ tay. */
    @Query("""
            SELECT e FROM NotebookEntry e
            JOIN FETCH e.notebook
            LEFT JOIN FETCH e.word w
            LEFT JOIN FETCH w.level
            LEFT JOIN FETCH w.representation
            LEFT JOIN FETCH e.kanji k
            WHERE e.user.id = :userId AND e.notebook.id = :notebookId
            AND (w IS NULL OR (w.isDeleted = false AND w.isActive = true))
            AND (k IS NULL OR (k.isDeleted = false AND k.isActive = true))
            ORDER BY e.id DESC
            """)
    List<NotebookEntry> findAllForUserAndNotebook(@Param("userId") Long userId,
                                                  @Param("notebookId") Long notebookId);

    // ── Thao tác theo từng sổ tay ──────────────────────────────────────
    Optional<NotebookEntry> findByNotebookIdAndWordId(Long notebookId, Long wordId);

    Optional<NotebookEntry> findByNotebookIdAndKanjiId(Long notebookId, Long kanjiId);

    /** Id các sổ tay (của user) đang chứa một từ — cho trạng thái picker. Bỏ qua từ đã xóa/tắt để khớp với danh sách hiển thị. */
    @Query("""
            SELECT e.notebook.id FROM NotebookEntry e
            WHERE e.user.id = :userId AND e.word.id = :wordId
            AND e.word.isDeleted = false AND e.word.isActive = true
            """)
    List<Long> findNotebookIdsByUserIdAndWordId(@Param("userId") Long userId, @Param("wordId") Long wordId);

    @Query("""
            SELECT e.notebook.id FROM NotebookEntry e
            WHERE e.user.id = :userId AND e.kanji.id = :kanjiId
            AND e.kanji.isDeleted = false AND e.kanji.isActive = true
            """)
    List<Long> findNotebookIdsByUserIdAndKanjiId(@Param("userId") Long userId, @Param("kanjiId") Long kanjiId);

    // ── Thao tác xuyên sổ tay (legacy/aggregate) ───────────────────────
    Optional<NotebookEntry> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndWordId(Long userId, Long wordId);

    boolean existsByUserIdAndKanjiId(Long userId, Long kanjiId);

    void deleteByUserIdAndWordId(Long userId, Long wordId);

    void deleteByUserIdAndKanjiId(Long userId, Long kanjiId);

    void deleteByUserId(Long userId);

    void deleteByNotebookId(Long notebookId);
}