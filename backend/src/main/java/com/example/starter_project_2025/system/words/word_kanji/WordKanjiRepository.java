package com.example.starter_project_2025.system.words.word_kanji;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WordKanjiRepository extends BaseCrudRepository<WordKanji, Long> {

    @Query("""
            SELECT wk FROM WordKanji wk
            JOIN FETCH wk.word w
            JOIN FETCH w.meaning m
            WHERE wk.character = :character
            AND wk.isDeleted = false
            AND w.isDeleted = false
            AND w.isActive = true
            ORDER BY w.frequency ASC NULLS LAST
            """)
    List<WordKanji> findByCharacterWithWords(@Param("character") String character, Pageable pageable);
}