package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.system.words.example.Example;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word_kanji.WordKanji;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DictionaryServiceImpl implements DictionaryService {

    DictionarySearchRepository searchRepository;

    @Override
    public List<WordSearchResult> search(String query, int limit) {
        String q = query.trim();
        String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;
        List<Word> words = searchRepository.search(q, kana, PageRequest.of(0, limit));
        return words.stream().map(this::toResult).toList();
    }

    @Override
    public List<WordSuggestion> suggest(String query, int limit) {
        String q = query.trim();
        String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;
        List<Word> words = searchRepository.suggest(q, kana, PageRequest.of(0, limit));
        return words.stream().map(this::toSuggestion).toList();
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