package com.example.starter_project_2025.domain.kanji_study.reading_passage;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiReadingPassageService {

    Page<KanjiReadingPassageDTO> getAll(Pageable pageable, String search, KanjiReadingPassageFilter filter);

    KanjiReadingPassageDTO getById(Long id);

    KanjiReadingPassageDTO create(KanjiReadingPassageDTO request);

    KanjiReadingPassageDTO update(Long id, KanjiReadingPassageDTO request);

    void delete(Long id);
}
