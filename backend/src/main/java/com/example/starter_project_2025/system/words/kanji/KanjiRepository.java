package com.example.starter_project_2025.system.words.kanji;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface KanjiRepository extends BaseCrudRepository<Kanji, Long> {

    boolean existsByCharacter(String character);

    boolean existsByCharacterAndIdNot(String character, Long id);

    Optional<Kanji> findByCharacter(String character);

    List<Kanji> findByCharacterInAndIsDeletedFalse(Collection<String> characters);

    @Query("""
            SELECT k FROM Kanji k
            WHERE k.isDeleted = false AND k.isActive = true
            AND (
                LOWER(k.character) LIKE LOWER(:q)
                OR LOWER(k.onyomi)  LIKE LOWER(:q)
                OR LOWER(k.kunyomi) LIKE LOWER(:q)
                OR LOWER(k.meaning) LIKE LOWER(:q)
                OR LOWER(k.onyomi)  LIKE LOWER(:kana)
                OR LOWER(k.kunyomi) LIKE LOWER(:kana)
            )
            ORDER BY CASE k.jlptLevel WHEN 'N5' THEN 1 WHEN 'N4' THEN 2 WHEN 'N3' THEN 3 WHEN 'N2' THEN 4 WHEN 'N1' THEN 5 ELSE 6 END ASC,
                     k.stroke ASC NULLS LAST
            """)
    List<Kanji> searchByKeyword(@Param("q") String likeQ, @Param("kana") String likeKana, Pageable pageable);

    @Query("""
            SELECT k FROM Kanji k
            WHERE k.isDeleted = false AND k.isActive = true
            ORDER BY CASE k.jlptLevel WHEN 'N5' THEN 1 WHEN 'N4' THEN 2 WHEN 'N3' THEN 3 WHEN 'N2' THEN 4 WHEN 'N1' THEN 5 ELSE 6 END ASC,
                     k.stroke ASC NULLS LAST
            """)
    List<Kanji> findFeaturedKanjis(Pageable pageable);

    /**
     * Duyệt toàn bộ kanji (màn "Từ vựng tổng hợp"), lọc tùy chọn theo JLPT
     * level (N5…N1). {@code level = null} → tất cả level.
     */
    @Query(value = """
            SELECT k FROM Kanji k
            WHERE k.isDeleted = false AND k.isActive = true
            AND (:level IS NULL OR k.jlptLevel = :level)
            ORDER BY CASE k.jlptLevel WHEN 'N5' THEN 1 WHEN 'N4' THEN 2 WHEN 'N3' THEN 3 WHEN 'N2' THEN 4 WHEN 'N1' THEN 5 ELSE 6 END ASC,
                     k.stroke ASC NULLS LAST, k.character ASC
            """,
            countQuery = """
            SELECT COUNT(k) FROM Kanji k
            WHERE k.isDeleted = false AND k.isActive = true
            AND (:level IS NULL OR k.jlptLevel = :level)
            """)
    Page<Kanji> browse(@Param("level") String level, Pageable pageable);
}