package com.example.starter_project_2025.domain.kanji_study.session;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KanjiStudySessionService {

    Page<KanjiStudySessionDTO> getAll(Pageable pageable, String search, KanjiStudySessionFilter filter);

    KanjiStudySessionDTO getById(Long id);

    KanjiStudySessionDTO create(KanjiStudySessionDTO request);

    KanjiStudySessionDTO update(Long id, KanjiStudySessionDTO request);

    void delete(Long id);
}
