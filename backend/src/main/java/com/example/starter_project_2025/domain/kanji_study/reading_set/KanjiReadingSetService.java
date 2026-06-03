package com.example.starter_project_2025.domain.kanji_study.reading_set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiReadingSetService {

    Page<KanjiReadingSetDTO> getAll(Pageable pageable, String search, KanjiReadingSetFilter filter);

    KanjiReadingSetDTO getById(Long id);

    KanjiReadingSetDTO create(KanjiReadingSetDTO request);

    KanjiReadingSetDTO update(Long id, KanjiReadingSetDTO request);

    void delete(Long id);
}
