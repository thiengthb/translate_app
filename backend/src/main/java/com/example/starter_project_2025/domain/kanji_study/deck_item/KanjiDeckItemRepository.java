package com.example.starter_project_2025.domain.kanji_study.deck_item;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KanjiDeckItemRepository
        extends JpaRepository<KanjiDeckItem, Long>, JpaSpecificationExecutor<KanjiDeckItem> {

    boolean existsByDeckIdAndKanjiId(Long deckId, Long kanjiId);

    boolean existsByDeckIdAndKanjiIdAndIdNot(Long deckId, Long kanjiId, Long id);
}
