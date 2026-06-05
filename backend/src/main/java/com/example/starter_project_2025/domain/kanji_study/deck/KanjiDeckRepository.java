package com.example.starter_project_2025.domain.kanji_study.deck;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiDeckRepository
        extends JpaRepository<KanjiDeck, Long>, JpaSpecificationExecutor<KanjiDeck> {
}
