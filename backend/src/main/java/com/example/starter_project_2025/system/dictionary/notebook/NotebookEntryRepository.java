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
     * Toàn bộ sổ tay của một user, mới lưu trước. Fetch sẵn word (+level,
     * representation) và kanji để mapper không lazy-load từng dòng.
     * Mục trỏ tới từ/kanji đã bị xóa (soft-delete) hoặc tắt hoạt động bị loại
     * ngay tại query — thay cho bước "reconcile" cũ ở frontend.
     */
    @Query("""
            SELECT e FROM NotebookEntry e
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

    Optional<NotebookEntry> findByUserIdAndWordId(Long userId, Long wordId);

    Optional<NotebookEntry> findByUserIdAndKanjiId(Long userId, Long kanjiId);

    Optional<NotebookEntry> findByIdAndUserId(Long id, Long userId);

    void deleteByUserId(Long userId);
}