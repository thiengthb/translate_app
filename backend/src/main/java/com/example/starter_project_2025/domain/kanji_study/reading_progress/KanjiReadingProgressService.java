package com.example.starter_project_2025.domain.kanji_study.reading_progress;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiReadingProgressService {

    Page<KanjiReadingProgressDTO> getAll(Pageable pageable, String search, KanjiReadingProgressFilter filter);

    KanjiReadingProgressDTO getById(Long id);

    KanjiReadingProgressDTO create(KanjiReadingProgressDTO request);

    KanjiReadingProgressDTO update(Long id, KanjiReadingProgressDTO request);

    void delete(Long id);
}
