package com.example.starter_project_2025.domain.kanji_study.detail;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiDetailRepository
        extends JpaRepository<KanjiDetail, Long>, JpaSpecificationExecutor<KanjiDetail> {

    boolean existsByKanjiId(Long kanjiId);

    boolean existsByKanjiIdAndIdNot(Long kanjiId, Long id);
}
