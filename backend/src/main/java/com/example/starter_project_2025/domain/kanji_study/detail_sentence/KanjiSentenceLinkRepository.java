package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiSentenceLinkRepository extends JpaRepository<KanjiSentenceLink, Long> {

    /** Paginated example sentences for a kanji, shortest first ("Câu"). */
    @Query(value = """
            SELECT s FROM KanjiSentenceLink l
            JOIN l.sentence s
            WHERE l.character = :character
            AND l.isDeleted = false
            AND s.isDeleted = false
            AND s.isActive = true
            ORDER BY s.lengthChars ASC NULLS LAST, s.id ASC
            """,
            countQuery = """
            SELECT count(l) FROM KanjiSentenceLink l
            JOIN l.sentence s
            WHERE l.character = :character
            AND l.isDeleted = false
            AND s.isDeleted = false
            AND s.isActive = true
            """)
    Page<KanjiSentence> pageSentencesByCharacter(@Param("character") String character, Pageable pageable);

    /** How many sentences are already linked to a character — used to cap per kanji during seeding. */
    @Query("""
            SELECT count(l) FROM KanjiSentenceLink l
            WHERE l.character = :character AND l.isDeleted = false
            """)
    long countByCharacter(@Param("character") String character);
}
