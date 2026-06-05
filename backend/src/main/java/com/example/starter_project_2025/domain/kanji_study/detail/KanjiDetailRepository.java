package com.example.starter_project_2025.domain.kanji_study.detail;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KanjiDetailRepository
        extends JpaRepository<KanjiDetail, Long>, JpaSpecificationExecutor<KanjiDetail> {

    boolean existsByCharacter(String character);

    boolean existsByCharacterAndIdNot(String character, Long id);

    Optional<KanjiDetail> findByCharacter(String character);
}
