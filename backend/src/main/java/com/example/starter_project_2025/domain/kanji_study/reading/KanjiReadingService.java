package com.example.starter_project_2025.domain.kanji_study.reading;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiReadingService {

    Page<KanjiReadingDTO> getAll(Pageable pageable, String search, KanjiReadingFilter filter);

    KanjiReadingDTO getById(Long id);

    KanjiReadingDTO create(KanjiReadingDTO request);

    KanjiReadingDTO update(Long id, KanjiReadingDTO request);

    void delete(Long id);
}
