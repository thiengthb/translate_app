package com.example.starter_project_2025.domain.kanji_study.progress;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiProgressRepository
        extends JpaRepository<KanjiProgress, Long>, JpaSpecificationExecutor<KanjiProgress> {

    boolean existsByUserIdAndKanjiId(Long userId, Long kanjiId);

    boolean existsByUserIdAndKanjiIdAndIdNot(Long userId, Long kanjiId, Long id);
}
