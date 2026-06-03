package com.example.starter_project_2025.domain.kanji_study.deck;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiDeckService {

    Page<KanjiDeckDTO> getAll(Pageable pageable, String search, KanjiDeckFilter filter);

    KanjiDeckDTO getById(Long id);

    KanjiDeckDTO create(KanjiDeckDTO request);

    KanjiDeckDTO update(Long id, KanjiDeckDTO request);

    void delete(Long id);
}
