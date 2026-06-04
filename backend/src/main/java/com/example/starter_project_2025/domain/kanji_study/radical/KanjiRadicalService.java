package com.example.starter_project_2025.domain.kanji_study.radical;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiRadicalService {

    Page<KanjiRadicalDTO> getAll(Pageable pageable, String search, KanjiRadicalFilter filter);

    KanjiRadicalDTO getById(Long id);

    KanjiRadicalDTO create(KanjiRadicalDTO request);

    KanjiRadicalDTO update(Long id, KanjiRadicalDTO request);

    void delete(Long id);
}
