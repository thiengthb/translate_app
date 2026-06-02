package com.example.starter_project_2025.domain.kanji_study.stroke_order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiStrokeOrderService {

    Page<KanjiStrokeOrderDTO> getAll(Pageable pageable, String search, KanjiStrokeOrderFilter filter);

    KanjiStrokeOrderDTO getById(Long id);

    KanjiStrokeOrderDTO create(KanjiStrokeOrderDTO request);

    KanjiStrokeOrderDTO update(Long id, KanjiStrokeOrderDTO request);

    void delete(Long id);
}
