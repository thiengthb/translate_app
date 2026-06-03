package com.example.starter_project_2025.domain.kanji_study.deck_item;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiDeckItemService {

    Page<KanjiDeckItemDTO> getAll(Pageable pageable, String search, KanjiDeckItemFilter filter);

    KanjiDeckItemDTO getById(Long id);

    KanjiDeckItemDTO create(KanjiDeckItemDTO request);

    KanjiDeckItemDTO update(Long id, KanjiDeckItemDTO request);

    void delete(Long id);
}
