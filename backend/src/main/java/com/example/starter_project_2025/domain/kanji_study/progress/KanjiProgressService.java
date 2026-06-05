package com.example.starter_project_2025.domain.kanji_study.progress;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiProgressService {

    Page<KanjiProgressDTO> getAll(Pageable pageable, String search, KanjiProgressFilter filter);

    KanjiProgressDTO getById(Long id);

    KanjiProgressDTO create(KanjiProgressDTO request);

    KanjiProgressDTO update(Long id, KanjiProgressDTO request);

    void delete(Long id);
}
