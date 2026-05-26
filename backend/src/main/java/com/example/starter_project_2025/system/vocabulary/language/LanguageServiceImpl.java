package com.example.starter_project_2025.system.vocabulary.language;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LanguageServiceImpl
        extends BaseCrudServiceImpl<Language, Long, LanguageDTO, LanguageFilter>
        implements LanguageService {

    LanguageMapper languageMapper;
    LanguageRepository languageRepository;

    @Override
    protected BaseCrudRepository<Language, Long> getRepository() {
        return languageRepository;
    }

    @Override
    protected BaseCrudMapper<Language, LanguageDTO> getMapper() {
        return languageMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"code", "name"};
    }

    @Override
    protected void beforeCreate(Language language, LanguageDTO request, ValidationContext ctx) {
        if (languageRepository.existsByCode(request.getCode())) {
            ctx.add("code", "Language code already exists");
        }
    }

    @Override
    protected void beforeUpdate(Language language, LanguageDTO request, ValidationContext ctx) {
        if (request.getCode() != null
                && !request.getCode().equals(language.getCode())
                && languageRepository.existsByCodeAndIdNot(request.getCode(), language.getId())) {
            ctx.add("code", "Language code already exists");
        }
    }
}
