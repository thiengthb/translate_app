package com.example.starter_project_2025.domain.kanji_study.stroke_order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiStrokeOrderRepository
        extends JpaRepository<KanjiStrokeOrder, Long>, JpaSpecificationExecutor<KanjiStrokeOrder> {

    boolean existsByKanjiId(Long kanjiId);

    boolean existsByKanjiIdAndIdNot(Long kanjiId, Long id);
}
