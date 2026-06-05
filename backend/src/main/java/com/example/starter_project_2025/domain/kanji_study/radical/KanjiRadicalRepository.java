package com.example.starter_project_2025.domain.kanji_study.radical;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiRadicalRepository
        extends JpaRepository<KanjiRadical, Long>, JpaSpecificationExecutor<KanjiRadical> {

    boolean existsByNumber(Integer number);

    boolean existsByNumberAndIdNot(Integer number, Long id);
}
