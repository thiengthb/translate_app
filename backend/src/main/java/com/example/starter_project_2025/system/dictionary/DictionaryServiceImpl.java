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
        Set<String> queryKanjiChars = extractKanjiChars(q);

        LinkedHashMap<String, Kanji> kanjiMap = new LinkedHashMap<>();

        // ── Step 1: Direct character lookup (user typed kanji directly) ──
        if (!queryKanjiChars.isEmpty()) {
            for (Kanji k : kanjiRepository.findByCharacterInAndIsDeletedFalse(queryKanjiChars)) {
                kanjiMap.put(k.getCharacter(), k);
            }
        }

        // ── Step 2: Keyword search in kanji table ─────────────────────
        //    Matches character / meaning / onyomi / kunyomi (both q and kana form)
        if (kanjiMap.size() < limit) {
            String likeQ    = "%" + q    + "%";
            String likeKana = "%" + kana + "%";
            for (Kanji k : kanjiRepository.searchByKeyword(likeQ, likeKana, PageRequest.of(0, limit))) {
                kanjiMap.putIfAbsent(k.getCharacter(), k);
                if (kanjiMap.size() >= limit) break;
            }
        }

        // ── Step 3: Cross-reference via word search ───────────────────
        //    Helps for inputs like romaji "seijin" → finds word 成人 → 成,人
        if (kanjiMap.isEmpty()) {
            List<Word> words = searchRepository.search(q, kana, PageRequest.of(0, 5));
            Set<String> charsFromWords = new LinkedHashSet<>();
            for (Word w : words) charsFromWords.addAll(extractKanjiChars(w.getWord()));
            if (!charsFromWords.isEmpty()) {
                for (Kanji k : kanjiRepository.findByCharacterInAndIsDeletedFalse(charsFromWords)) {
                    kanjiMap.put(k.getCharacter(), k);
                    if (kanjiMap.size() >= limit) break;
                }
            }
        }

        return kanjiMap.values().stream()
                .limit(limit)
                .map(this::toKanjiResult)
                .toList();
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

    // ── Mappers ────────────────────────────────────────────────────────

    private KanjiSearchResult toKanjiResult(Kanji k) {
        List<KanjiSearchResult.WordInfo> relatedWords = wordKanjiRepository
                .findByCharacterWithWords(k.getCharacter(), PageRequest.of(0, 8))
                .stream()
                .map(wk -> KanjiSearchResult.WordInfo.builder()
                        .word(wk.getWord().getWord())
                        .reading(wk.getWord().getReading())
                        .meaningText(wk.getWord().getMeaning().getName())
                        .build())
                .toList();

        return KanjiSearchResult.builder()
                .character(k.getCharacter())
                .meaning(k.getMeaning())
                .onyomi(k.getOnyomi())
                .kunyomi(k.getKunyomi())
                .stroke(k.getStroke())
                .radical(k.getRadical())
                .jlptLevel(k.getJlptLevel())
                .words(relatedWords)
                .build();
    }

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