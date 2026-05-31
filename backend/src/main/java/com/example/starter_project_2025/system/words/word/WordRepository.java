package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WordRepository extends BaseCrudRepository<Word, Long> {

    boolean existsByWordAndIsDeletedFalse(String word);

    /** Active words for a JLPT level, looked up by the level's code (e.g. "N5"). */
    @Query("select w from Word w where w.isDeleted = false and w.level.code = :code")
    List<Word> findByLevelCode(@Param("code") String code);
}