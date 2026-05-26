package com.example.starter_project_2025.system.vocabulary.meaning;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.vocabulary.language.Language;
import com.example.starter_project_2025.system.vocabulary.language.LanguageRepository;
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
    protected void beforeCreate(Meaning meaning, MeaningDTO request, ValidationContext ctx) {
        Language language = resolveLanguage(request.getLanguageId(), ctx);
        if (language != null) {
            meaning.setLanguage(language);
        }
    }

    @Override
    protected void beforeUpdate(Meaning meaning, MeaningDTO request, ValidationContext ctx) {
        if (request.getLanguageId() != null) {
            Language language = resolveLanguage(request.getLanguageId(), ctx);
            if (language != null) {
                meaning.setLanguage(language);
            }
        }
    }

    /**
     * Resolves languageId → Language entity.
     * Adds a validation error if not found and returns null.
     */
    private Language resolveLanguage(Long languageId, ValidationContext ctx) {
        return languageRepository.findById(languageId)
                .orElseGet(() -> {
                    ctx.add("languageId", "Language not found with id: " + languageId);
                    return null;
                });
    }
}
