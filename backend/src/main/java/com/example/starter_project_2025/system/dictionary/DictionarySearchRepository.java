package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.system.words.word.Word;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DictionarySearchRepository extends JpaRepository<Word, Long> {

    @Query("""
            SELECT DISTINCT w FROM Word w
            JOIN w.meanings m
            JOIN FETCH w.level l
            JOIN FETCH w.representation r
            WHERE w.isDeleted = false
            AND w.isActive = true
            AND (
                LOWER(w.word)       LIKE LOWER(CONCAT('%', :q,    '%'))
                OR LOWER(w.reading) LIKE LOWER(CONCAT('%', :q,    '%'))
                OR LOWER(m.name)    LIKE LOWER(CONCAT('%', :q,    '%'))
                OR LOWER(w.word)    LIKE LOWER(CONCAT('%', :kana, '%'))
                OR LOWER(w.reading) LIKE LOWER(CONCAT('%', :kana, '%'))
            )
            ORDER BY w.frequency ASC NULLS LAST, w.word ASC
            """)
    List<Word> search(@Param("q") String q, @Param("kana") String kana, Pageable pageable);

    @Query("""
            SELECT DISTINCT w FROM Word w
            JOIN w.meanings m
            JOIN FETCH w.level l
            WHERE w.isDeleted = false
            AND w.isActive = true
            AND (
                LOWER(w.word)       LIKE LOWER(CONCAT(:q,    '%'))
                OR LOWER(w.reading) LIKE LOWER(CONCAT(:kana, '%'))
                OR LOWER(m.name)    LIKE LOWER(CONCAT(:q,    '%'))
            )
            ORDER BY w.frequency ASC NULLS LAST, w.word ASC
            """)
    List<Word> suggest(@Param("q") String q, @Param("kana") String kana, Pageable pageable);

    @Query("""
            SELECT w FROM Word w
            JOIN FETCH w.level l
            JOIN FETCH w.representation r
            WHERE w.isDeleted = false AND w.isActive = true
            AND w.frequency IS NOT NULL
            ORDER BY w.frequency ASC
            """)
    List<Word> findFeaturedWords(Pageable pageable);

    /**
     * Duyệt toàn bộ từ vựng (màn "Từ vựng tổng hợp"), lọc tùy chọn theo
     * level code (N5…N1). {@code level = null} → tất cả level.
     */
    @Query(value = """
            SELECT w FROM Word w
            JOIN w.level l
            WHERE w.isDeleted = false AND w.isActive = true
            AND (:level IS NULL OR l.code = :level)
            ORDER BY w.frequency ASC NULLS LAST, w.word ASC
            """,
            countQuery = """
            SELECT COUNT(w) FROM Word w
            JOIN w.level l
            WHERE w.isDeleted = false AND w.isActive = true
            AND (:level IS NULL OR l.code = :level)
            """)
    Page<Word> browse(@Param("level") String level, Pageable pageable);
}