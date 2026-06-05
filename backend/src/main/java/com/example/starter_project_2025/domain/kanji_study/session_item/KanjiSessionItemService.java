package com.example.starter_project_2025.domain.kanji_study.session_item;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiSessionItemService {

    Page<KanjiSessionItemDTO> getAll(Pageable pageable, String search, KanjiSessionItemFilter filter);

    KanjiSessionItemDTO getById(Long id);

    KanjiSessionItemDTO create(KanjiSessionItemDTO request);

    KanjiSessionItemDTO update(Long id, KanjiSessionItemDTO request);

    void delete(Long id);
}
