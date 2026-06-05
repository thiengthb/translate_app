package com.example.starter_project_2025.domain.kanji_study.writing_attempt;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiWritingAttemptRepository
        extends JpaRepository<KanjiWritingAttempt, Long>, JpaSpecificationExecutor<KanjiWritingAttempt> {
}
