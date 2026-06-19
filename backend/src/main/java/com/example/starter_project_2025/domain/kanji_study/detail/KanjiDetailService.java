package com.example.starter_project_2025.domain.kanji_study.detail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiDetailService {

    Page<KanjiDetailDTO> getAll(Pageable pageable, String search, KanjiDetailFilter filter);

    Page<KanjiDetailDTO> findByComponent(String component, Pageable pageable);

    KanjiDetailDTO getById(Long id);

    KanjiDetailDTO create(KanjiDetailDTO request);

    KanjiDetailDTO update(Long id, KanjiDetailDTO request);

    void delete(Long id);
}
