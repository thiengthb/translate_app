package com.example.starter_project_2025.domain.kanji_study.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiReadingRepository
        extends JpaRepository<KanjiReading, Long>, JpaSpecificationExecutor<KanjiReading> {

    boolean existsByKanjiIdAndReadingTypeAndValue(Long kanjiId, String readingType, String value);
}
