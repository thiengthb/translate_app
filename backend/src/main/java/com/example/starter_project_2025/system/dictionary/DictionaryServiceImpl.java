package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.system.words.example.Example;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.kanji.KanjiRepository;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word_kanji.WordKanji;
import com.example.starter_project_2025.system.words.word_kanji.WordKanjiRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DictionaryServiceImpl implements DictionaryService {

    DictionarySearchRepository searchRepository;
    KanjiRepository            kanjiRepository;
    WordKanjiRepository        wordKanjiRepository;

    @Override
    public List<WordSearchResult> search(String query, int limit) {
        String q    = query.trim();
        String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;
        return searchRepository.search(q, kana, PageRequest.of(0, limit))
                               .stream().map(this::toResult).toList();
    }

    @Override
    public List<WordSuggestion> suggest(String query, int limit) {
        String q    = query.trim();
        String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;
        return searchRepository.suggest(q, kana, PageRequest.of(0, limit))
                               .stream().map(this::toSuggestion).toList();
    }

    @Override
    public List<KanjiSearchResult> searchKanji(String query, int limit) {
        String q    = query.trim();
        String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;

        Set<String> queryKanjiChars  = extractKanjiChars(q);
        boolean     filterByQueryKanji = !queryKanjiChars.isEmpty();

        Map<String, KanjiAccumulator> kanjiMap = new LinkedHashMap<>();

        // ── Strategy 1: word-based via word_kanjis ────────────────────
        List<Word> words = searchRepository.search(q, kana, PageRequest.of(0, limit));
        for (Word word : words) {
            if (word.getWordKanjis() == null) continue;
            for (WordKanji wk : word.getWordKanjis()) {
                if (Boolean.TRUE.equals(wk.getIsDeleted())) continue;
                String ch = wk.getCharacter();
                if (ch == null) continue;
                if (filterByQueryKanji && !queryKanjiChars.contains(ch)) continue;

                kanjiMap.computeIfAbsent(ch, k -> {
                    String jlptLevel = kanjiRepository.findByCharacter(k)
                            .map(Kanji::getJlptLevel).orElse(null);
                    return new KanjiAccumulator(wk, jlptLevel);
                });

                KanjiAccumulator acc = kanjiMap.get(ch);
                if (acc.words.stream().noneMatch(wi -> wi.getWord().equals(word.getWord()))) {
                    acc.words.add(KanjiSearchResult.WordInfo.builder()
                            .word(word.getWord())
                            .reading(word.getReading())
                            .meaningText(word.getMeaning().getName())
                            .build());
                }
            }
        }

        // ── Strategy 2: direct kanji table lookup (fallback) ─────────
        if (kanjiMap.isEmpty()) {
            // Determine which kanji characters to look up
            Set<String> charsToLookup = new LinkedHashSet<>(queryKanjiChars);

            // If query has no kanji chars (romaji/meaning/kana), extract from found words
            // e.g. query="seijin" → found word "成人" → chars={成,人}
            if (charsToLookup.isEmpty()) {
                for (Word w : words) {
                    charsToLookup.addAll(extractKanjiChars(w.getWord()));
                    if (charsToLookup.size() >= limit) break;
                }
            }

            List<Kanji> kanjis;
            if (!charsToLookup.isEmpty()) {
                kanjis = kanjiRepository.findByCharacterInAndIsDeletedFalse(charsToLookup);
            } else {
                // Last resort: full-text keyword search (e.g. search by meaning)
                String likeQ = "%" + q + "%";
                kanjis = kanjiRepository.searchByKeyword(likeQ, PageRequest.of(0, limit));
            }

            for (Kanji k : kanjis) {
                if (k.getCharacter() == null) continue;
                KanjiAccumulator acc = new KanjiAccumulator(k);
                wordKanjiRepository
                        .findByCharacterWithWords(k.getCharacter(), PageRequest.of(0, 8))
                        .forEach(wk -> acc.words.add(KanjiSearchResult.WordInfo.builder()
                                .word(wk.getWord().getWord())
                                .reading(wk.getWord().getReading())
                                .meaningText(wk.getWord().getMeaning().getName())
                                .build()));
                kanjiMap.put(k.getCharacter(), acc);
            }
        }

        return kanjiMap.values().stream().map(KanjiAccumulator::toResult).toList();
    }

    @Override
    public FeaturedResult featured(int wordLimit, int kanjiLimit) {
        List<Word> words = searchRepository.findFeaturedWords(PageRequest.of(0, wordLimit));
        List<Kanji> kanjis = kanjiRepository.findFeaturedKanjis(PageRequest.of(0, kanjiLimit));

        return FeaturedResult.builder()
                .words(words.stream().map(this::toResult).toList())
                .kanjis(kanjis.stream().map(k -> KanjiSearchResult.builder()
                        .character(k.getCharacter())
                        .meaning(k.getMeaning())
                        .onyomi(k.getOnyomi())
                        .kunyomi(k.getKunyomi())
                        .stroke(k.getStroke())
                        .radical(k.getRadical())
                        .jlptLevel(k.getJlptLevel())
                        .words(List.of())
                        .build()).toList())
                .build();
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private static Set<String> extractKanjiChars(String s) {
        Set<String> result = new LinkedHashSet<>();
        for (char c : s.toCharArray()) {
            if (Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS.equals(Character.UnicodeBlock.of(c))) {
                result.add(String.valueOf(c));
            }
        }
        return result;
    }

    private static class KanjiAccumulator {
        final String character;
        final String meaning;
        final String onyomi;
        final String kunyomi;
        final Integer stroke;
        final String radical;
        final String jlptLevel;
        final List<KanjiSearchResult.WordInfo> words = new ArrayList<>();

        // From word_kanjis link (Strategy 1)
        KanjiAccumulator(WordKanji wk, String jlptLevel) {
            this.character = wk.getCharacter();
            this.meaning   = wk.getMeaning();
            this.onyomi    = wk.getOnyomi();
            this.kunyomi   = wk.getKunyomi();
            this.stroke    = wk.getStroke();
            this.radical   = wk.getRadical();
            this.jlptLevel = jlptLevel;
        }

        // From kanjis table directly (Strategy 2 fallback)
        KanjiAccumulator(Kanji k) {
            this.character = k.getCharacter();
            this.meaning   = k.getMeaning();
            this.onyomi    = k.getOnyomi();
            this.kunyomi   = k.getKunyomi();
            this.stroke    = k.getStroke();
            this.radical   = k.getRadical();
            this.jlptLevel = k.getJlptLevel();
        }

        KanjiSearchResult toResult() {
            return KanjiSearchResult.builder()
                    .character(character)
                    .meaning(meaning)
                    .onyomi(onyomi)
                    .kunyomi(kunyomi)
                    .stroke(stroke)
                    .radical(radical)
                    .jlptLevel(jlptLevel)
                    .words(words)
                    .build();
        }
    }

    // ── Mappers ────────────────────────────────────────────────────────

    private WordSuggestion toSuggestion(Word word) {
        return WordSuggestion.builder()
                .id(word.getId())
                .word(word.getWord())
                .reading(word.getReading())
                .meaningText(word.getMeaning().getName())
                .levelCode(word.getLevel().getCode())
                .build();
    }

    private WordSearchResult toResult(Word word) {
        List<WordSearchResult.KanjiInfo> kanjis = word.getWordKanjis() == null
                ? List.of()
                : word.getWordKanjis().stream()
                        .filter(wk -> Boolean.FALSE.equals(wk.getIsDeleted()))
                        .map(this::toKanjiInfo)
                        .toList();

        List<WordSearchResult.ExampleInfo> examples = word.getExamples() == null
                ? List.of()
                : word.getExamples().stream()
                        .filter(ex -> Boolean.FALSE.equals(ex.getIsDeleted()))
                        .map(this::toExampleInfo)
                        .toList();

        return WordSearchResult.builder()
                .id(word.getId())
                .word(word.getWord())
                .reading(word.getReading())
                .wordType(word.getWordType())
                .frequency(word.getFrequency())
                .representationCode(word.getRepresentation().getCode())
                .representationName(word.getRepresentation().getName())
                .meaningText(word.getMeaning().getName())
                .levelCode(word.getLevel().getCode())
                .levelName(word.getLevel().getName())
                .kanjis(kanjis)
                .examples(examples)
                .build();
    }

    private WordSearchResult.KanjiInfo toKanjiInfo(WordKanji wk) {
        return WordSearchResult.KanjiInfo.builder()
                .character(wk.getCharacter())
                .onyomi(wk.getOnyomi())
                .kunyomi(wk.getKunyomi())
                .meaning(wk.getMeaning())
                .stroke(wk.getStroke())
                .radical(wk.getRadical())
                .build();
    }

    private WordSearchResult.ExampleInfo toExampleInfo(Example ex) {
        return WordSearchResult.ExampleInfo.builder()
                .rootExample(ex.getRootExample())
                .toExample(ex.getToExample())
                .rootLanguageName(ex.getRootLanguage() != null ? ex.getRootLanguage().getName() : null)
                .toLanguageName(ex.getToLanguage() != null ? ex.getToLanguage().getName() : null)
                .build();
    }
}