package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.CrudAction;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.words.example.Example;
import com.example.starter_project_2025.system.words.language.Language;
import com.example.starter_project_2025.system.words.language.LanguageRepository;
import com.example.starter_project_2025.system.words.level.Level;
import com.example.starter_project_2025.system.words.level.LevelRepository;
import com.example.starter_project_2025.system.words.mean.Meaning;
import com.example.starter_project_2025.system.words.representation.Representation;
import com.example.starter_project_2025.system.words.representation.RepresentationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WordServiceImpl
        extends BaseCrudServiceImpl<Word, Long, WordDTO, WordFilter>
        implements WordService {

    WordMapper wordMapper;
    WordRepository wordRepository;
    RepresentationRepository representationRepository;
    LevelRepository levelRepository;
    LanguageRepository languageRepository;

    @Override
    protected BaseCrudRepository<Word, Long> getRepository() {
        return wordRepository;
    }

    @Override
    protected BaseCrudMapper<Word, WordDTO> getMapper() {
        return wordMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"word", "reading", "wordType"};
    }

    @Override
    protected void beforeCreate(Word entity, WordDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    @Override
    protected void beforeUpdate(Word entity, WordDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    private void resolveRelations(Word entity, WordDTO request) {
        if (request.getRepresentationId() != null) {
            Representation representation = representationRepository.findById(request.getRepresentationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Representation not found"));
            entity.setRepresentation(representation);
        }
        if (request.getLevelId() != null) {
            Level level = levelRepository.findById(request.getLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Level not found"));
            entity.setLevel(level);
        }
    }

    @Override
    public WordDTO createFull(WordCreateRequest request) {
        checkPermission(CrudAction.CREATE);

        Representation representation = representationRepository.findById(request.getRepresentationId())
                .orElseThrow(() -> new ResourceNotFoundException("Representation not found"));
        Level level = levelRepository.findById(request.getLevelId())
                .orElseThrow(() -> new ResourceNotFoundException("Level not found"));

        Word word = Word.builder()
                .word(request.getWord())
                .reading(request.getReading())
                .wordType(request.getWordType())
                .frequency(request.getFrequency())
                .representation(representation)
                .level(level)
                .meanings(new java.util.ArrayList<>())
                .examples(new java.util.ArrayList<>())
                .build();

        if (request.getMeanings() != null) {
            for (WordCreateRequest.MeaningInput mi : request.getMeanings()) {
                Language language = languageRepository.findById(mi.getLanguageId())
                        .orElseThrow(() -> new ResourceNotFoundException("Language not found"));
                Meaning meaning = Meaning.builder()
                        .language(language)
                        .name(mi.getName())
                        .word(word)
                        .build();
                word.getMeanings().add(meaning);
            }
        }

        if (request.getExamples() != null) {
            for (WordCreateRequest.ExampleInput ei : request.getExamples()) {
                if (ei.getRootExample() == null || ei.getRootExample().isBlank()) {
                    continue;
                }
                Language rootLanguage = languageRepository.findById(ei.getRootLanguageId())
                        .orElseThrow(() -> new ResourceNotFoundException("Root language not found"));
                Language toLanguage = languageRepository.findById(ei.getToLanguageId())
                        .orElseThrow(() -> new ResourceNotFoundException("Target language not found"));
                Example example = Example.builder()
                        .rootLanguage(rootLanguage)
                        .toLanguage(toLanguage)
                        .rootExample(ei.getRootExample())
                        .toExample(ei.getToExample())
                        .word(word)
                        .build();
                word.getExamples().add(example);
            }
        }

        Word saved = wordRepository.save(word);
        return wordMapper.toResponse(saved);
    }
}