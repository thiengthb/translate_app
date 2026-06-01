package com.example.starter_project_2025.system.words.mean;

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
public class MeaningServiceImpl
        extends BaseCrudServiceImpl<Meaning, Long, MeaningDTO, MeaningFilter>
        implements MeaningService {

    MeaningMapper meaningMapper;
    MeaningRepository meaningRepository;
    LanguageRepository languageRepository;
    WordRepository wordRepository;

    @Override
    protected BaseCrudRepository<Meaning, Long> getRepository() {
        return meaningRepository;
    }

    @Override
    protected BaseCrudMapper<Meaning, MeaningDTO> getMapper() {
        return meaningMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name"};
    }

    @Override
    protected void beforeCreate(Meaning entity, MeaningDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    @Override
    protected void beforeUpdate(Meaning entity, MeaningDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    private void resolveRelations(Meaning entity, MeaningDTO request) {
        if (request.getLanguageId() != null) {
            Language language = languageRepository.findById(request.getLanguageId())
                    .orElseThrow(() -> new ResourceNotFoundException("Language not found"));
            entity.setLanguage(language);
        }
        if (request.getWordId() != null) {
            Word word = wordRepository.findById(request.getWordId())
                    .orElseThrow(() -> new ResourceNotFoundException("Word not found"));
            entity.setWord(word);
        }
    }
}