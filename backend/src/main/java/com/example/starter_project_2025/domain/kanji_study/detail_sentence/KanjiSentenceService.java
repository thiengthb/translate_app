package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import com.example.starter_project_2025.system.analyze.FuriganaSegment;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read logic for the per-kanji "Câu" section: paginates {@link KanjiSentence}s
 * linked to a character (shortest first) and rehydrates the stored furigana JSON
 * into {@link FuriganaSegment}s for the frontend.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiSentenceService {

    KanjiSentenceLinkRepository linkRepository;
    KanjiSentenceRepository sentenceRepository;
    ObjectMapper objectMapper;

    private static final TypeReference<List<FuriganaSegment>> SEGMENT_LIST =
            new TypeReference<>() {};

    public KanjiSentencePage kanjiSentences(String character, int page, int size) {
        Page<KanjiSentence> result = linkRepository
                .pageSentencesByCharacter(character, PageRequest.of(page, size));
        return KanjiSentencePage.builder()
                .items(result.getContent().stream().map(this::toItem).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    /** Sentences containing a word/phrase (word detail page), shortest first. */
    public KanjiSentencePage sentencesContaining(String text, int page, int size) {
        Page<KanjiSentence> result = sentenceRepository
                .pageByTextContaining(text, PageRequest.of(page, size));
        return KanjiSentencePage.builder()
                .items(result.getContent().stream().map(this::toItem).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private KanjiSentenceItem toItem(KanjiSentence s) {
        return KanjiSentenceItem.builder()
                .id(s.getId())
                .japanese(s.getJapanese())
                .segments(parseSegments(s.getSegmentsJson()))
                .translationEn(s.getTranslationEn())
                .translationVi(s.getTranslationVi())
                .source(s.getSource())
                .build();
    }

    private List<FuriganaSegment> parseSegments(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, SEGMENT_LIST);
        } catch (Exception e) {
            log.warn("Failed to parse furigana segments JSON: {}", e.getMessage());
            return List.of();
        }
    }
}
