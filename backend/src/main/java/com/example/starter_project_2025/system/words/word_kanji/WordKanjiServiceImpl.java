package com.example.starter_project_2025.system.words.word_kanji;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.kanji.KanjiRepository;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word.WordRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WordKanjiServiceImpl
        extends BaseCrudServiceImpl<WordKanji, Long, WordKanjiDTO, WordKanjiFilter>
        implements WordKanjiService {

    WordKanjiMapper wordKanjiMapper;
    WordKanjiRepository wordKanjiRepository;
    WordRepository wordRepository;
    KanjiRepository kanjiRepository;

    @Override
    protected BaseCrudRepository<WordKanji, Long> getRepository() {
        return wordKanjiRepository;
    }

    @Override
    protected BaseCrudMapper<WordKanji, WordKanjiDTO> getMapper() {
        return wordKanjiMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"character", "meaning"};
    }

    @Override
    protected void beforeCreate(WordKanji entity, WordKanjiDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    @Override
    protected void beforeUpdate(WordKanji entity, WordKanjiDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    private void resolveRelations(WordKanji entity, WordKanjiDTO request) {
        if (request.getWordId() != null) {
            Word word = wordRepository.findById(request.getWordId())
                    .orElseThrow(() -> new ResourceNotFoundException("Word not found"));
            entity.setWord(word);
        }
        if (request.getKanjiId() != null) {
            Kanji kanji = kanjiRepository.findById(request.getKanjiId())
                    .orElseThrow(() -> new ResourceNotFoundException("Kanji not found"));
            entity.setKanji(kanji);
        }
    }
}