package com.example.starter_project_2025.domain.kanji_study.detail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KanjiDetailRepository
        extends JpaRepository<KanjiDetail, Long>, JpaSpecificationExecutor<KanjiDetail> {

    boolean existsByCharacter(String character);

    boolean existsByCharacterAndIdNot(String character, Long id);

    Optional<KanjiDetail> findByCharacter(String character);

    /**
     * Kanji whose KanjiVG decomposition tree (strokeData JSON) contains the given
     * component, either as a node {@code element} or as the {@code original} form
     * a variant derives from (e.g. searching 人 also finds kanji built with 亻).
     * Easiest level first (SC1…SC6 → TC1…TC3 → NC → KHAC), then by stroke count.
     */
    @Query(value = """
            SELECT k FROM KanjiDetail k
            WHERE k.isDeleted = false
              AND (k.strokeData LIKE CONCAT('%"element":"', :component, '"%')
                   OR k.strokeData LIKE CONCAT('%"original":"', :component, '"%'))
            ORDER BY CASE k.jlptLevel
                WHEN 'SC1' THEN 1 WHEN 'SC2' THEN 2 WHEN 'SC3' THEN 3
                WHEN 'SC4' THEN 4 WHEN 'SC5' THEN 5 WHEN 'SC6' THEN 6
                WHEN 'TC1' THEN 7 WHEN 'TC2' THEN 8 WHEN 'TC3' THEN 9
                WHEN 'NC' THEN 10 ELSE 11 END,
              k.strokeCount ASC
            """,
            countQuery = """
            SELECT COUNT(k) FROM KanjiDetail k
            WHERE k.isDeleted = false
              AND (k.strokeData LIKE CONCAT('%"element":"', :component, '"%')
                   OR k.strokeData LIKE CONCAT('%"original":"', :component, '"%'))
            """)
    Page<KanjiDetail> findByComponent(@Param("component") String component, Pageable pageable);
}
