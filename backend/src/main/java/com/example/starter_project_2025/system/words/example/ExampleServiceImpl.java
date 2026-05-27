package com.example.starter_project_2025.system.words.example;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.words.language.Language;
import com.example.starter_project_2025.system.words.language.LanguageRepository;
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
public class ExampleServiceImpl
        extends BaseCrudServiceImpl<Example, Long, ExampleDTO, ExampleFilter>
        implements ExampleService {

    ExampleMapper exampleMapper;
    ExampleRepository exampleRepository;
    LanguageRepository languageRepository;
    WordRepository wordRepository;

    @Override
    protected BaseCrudRepository<Example, Long> getRepository() {
        return exampleRepository;
    }

    @Override
    protected BaseCrudMapper<Example, ExampleDTO> getMapper() {
        return exampleMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"rootExample", "toExample"};
    }

    @Override
    protected void beforeCreate(Example entity, ExampleDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    @Override
    protected void beforeUpdate(Example entity, ExampleDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    private void resolveRelations(Example entity, ExampleDTO request) {
        if (request.getRootLanguageId() != null) {
            Language rootLanguage = languageRepository.findById(request.getRootLanguageId())
                    .orElseThrow(() -> new ResourceNotFoundException("Root language not found"));
            entity.setRootLanguage(rootLanguage);
        }
        if (request.getToLanguageId() != null) {
            Language toLanguage = languageRepository.findById(request.getToLanguageId())
                    .orElseThrow(() -> new ResourceNotFoundException("Target language not found"));
            entity.setToLanguage(toLanguage);
        }
        if (request.getWordId() != null) {
            Word word = wordRepository.findById(request.getWordId())
                    .orElseThrow(() -> new ResourceNotFoundException("Word not found"));
            entity.setWord(word);
        }
    }
}