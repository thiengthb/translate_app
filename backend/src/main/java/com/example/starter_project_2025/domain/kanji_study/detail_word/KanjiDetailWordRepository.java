package com.example.starter_project_2025.domain.kanji_study.detail_word;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface KanjiDetailWordRepository extends JpaRepository<KanjiDetailWord, Long> {

    /** Paginated vocabulary for a kanji, most-frequent first ("Từ vựng"). */
    @Query(value = """
            SELECT kdw FROM KanjiDetailWord kdw
            JOIN kdw.word w
            WHERE kdw.character = :character
            AND kdw.isDeleted = false
            AND w.isDeleted = false
            AND w.isActive = true
            ORDER BY w.frequency ASC NULLS LAST
            """,
            countQuery = """
            SELECT count(kdw) FROM KanjiDetailWord kdw
            JOIN kdw.word w
            WHERE kdw.character = :character
            AND kdw.isDeleted = false
            AND w.isDeleted = false
            AND w.isActive = true
            """)
    Page<KanjiDetailWord> pageByCharacter(@Param("character") String character, Pageable pageable);

    /** Bounded, frequency-ordered links for reading-grouping ("Ví dụ phát âm"). */
    @Query("""
            SELECT kdw FROM KanjiDetailWord kdw
            JOIN FETCH kdw.word w
            WHERE kdw.character = :character
            AND kdw.isDeleted = false
            AND w.isDeleted = false
            AND w.isActive = true
            ORDER BY w.frequency ASC NULLS LAST
            """)
    List<KanjiDetailWord> findByCharacterWithWords(@Param("character") String character, Pageable pageable);

    /** Word ids already linked — lets the backfill skip them cheaply. */
    @Query("SELECT DISTINCT kdw.word.id FROM KanjiDetailWord kdw WHERE kdw.isDeleted = false")
    Set<Long> findDistinctLinkedWordIds();
}
