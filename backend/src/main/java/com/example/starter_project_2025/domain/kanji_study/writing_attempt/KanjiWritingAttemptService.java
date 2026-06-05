package com.example.starter_project_2025.domain.kanji_study.writing_attempt;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiWritingAttemptService {

    Page<KanjiWritingAttemptDTO> getAll(Pageable pageable, String search, KanjiWritingAttemptFilter filter);

    KanjiWritingAttemptDTO getById(Long id);

    KanjiWritingAttemptDTO create(KanjiWritingAttemptDTO request);

    KanjiWritingAttemptDTO update(Long id, KanjiWritingAttemptDTO request);

    void delete(Long id);
}
