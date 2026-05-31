package com.example.starter_project_2025.domain.production.vocab;

import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Resolves a {@link VocabSource} into a small random sample of vocabulary words,
 * used to seed LLM prompt generation in the production drill.
 */
@Service
@RequiredArgsConstructor
public class VocabSelectionService {

    private final WordRepository wordRepository;
    private final DeckItemRepository deckItemRepository;
    private final FlashcardRepository flashcardRepository;

    /** All words for the source (no sampling) — drives the coverage-drill selector. */
    @Transactional(readOnly = true)
    public List<VocabWord> fetchAll(VocabSource source) {
        return resolveWords(source).stream()
                .map(w -> new VocabWord(w.getWord(), w.getReading(), firstGloss(w)))
                .toList();
    }

    /** Fetch up to {@code limit} words for the given source (random sample). */
    @Transactional(readOnly = true)
    public List<VocabWord> fetch(VocabSource source, int limit) {
        List<VocabWord> all = new ArrayList<>(fetchAll(source));
        if (all.isEmpty() || limit <= 0 || all.size() <= limit) {
            return all;
        }
        Collections.shuffle(all);
        return new ArrayList<>(all.subList(0, limit));
    }

    private List<Word> resolveWords(VocabSource source) {
        if (source == null || source.getType() == null) {
            return List.of();
        }
        return switch (source.getType().trim().toUpperCase()) {
            case "LEVEL" -> (source.getLevel() == null || source.getLevel().isBlank())
                    ? List.of()
                    : wordRepository.findByLevelCode(source.getLevel().trim());
            case "DECK" -> source.getDeckId() == null
                    ? List.of()
                    : wordsFromDeck(source.getDeckId());
            default -> List.of();
        };
    }

    private List<Word> wordsFromDeck(Long deckId) {
        List<DeckItem> items = deckItemRepository.findByDeckIdOrderByOrderIndexAsc(deckId);
        // getFlashcard().getId() reads the id off the lazy proxy without a DB hit.
        List<Long> flashcardIds = items.stream()
                .map(DeckItem::getFlashcard)
                .filter(Objects::nonNull)
                .map(Flashcard::getId)
                .toList();
        if (flashcardIds.isEmpty()) {
            return List.of();
        }
        List<Long> wordIds = flashcardRepository.findAllById(flashcardIds).stream()
                .map(Flashcard::getWordId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return wordIds.isEmpty() ? List.of() : wordRepository.findAllById(wordIds);
    }

    private String firstGloss(Word w) {
        if (w.getMeanings() == null) {
            return null;
        }
        for (Meaning m : w.getMeanings()) {
            if (Boolean.TRUE.equals(m.getIsDeleted())) {
                continue;
            }
            if (m.getName() != null && !m.getName().isBlank()) {
                return m.getName().trim();
            }
        }
        return null;
    }
}
