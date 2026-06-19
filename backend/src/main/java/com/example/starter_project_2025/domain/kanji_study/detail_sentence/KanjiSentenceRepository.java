package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Set;

@Repository
public interface KanjiSentenceRepository extends JpaRepository<KanjiSentence, Long> {

    /** Tatoeba ids already imported — lets the seeder skip duplicates cheaply. */
    @Query("SELECT s.tatoebaId FROM KanjiSentence s WHERE s.tatoebaId IS NOT NULL")
    Set<Long> findAllTatoebaIds();

    /** Sentences whose Japanese text contains the given word, shortest first. */
    @Query(value = """
            SELECT s FROM KanjiSentence s
            WHERE s.isDeleted = false
              AND s.japanese LIKE CONCAT('%', :text, '%')
            ORDER BY s.lengthChars ASC NULLS LAST, s.id ASC
            """,
            countQuery = """
            SELECT COUNT(s) FROM KanjiSentence s
            WHERE s.isDeleted = false
              AND s.japanese LIKE CONCAT('%', :text, '%')
            """)
    Page<KanjiSentence> pageByTextContaining(@Param("text") String text, Pageable pageable);
}
