package com.example.starter_project_2025.system.words.kanji;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiRepository extends BaseCrudRepository<Kanji, Long> {

    boolean existsByCharacter(String character);

    boolean existsByCharacterAndIdNot(String character, Long id);
}