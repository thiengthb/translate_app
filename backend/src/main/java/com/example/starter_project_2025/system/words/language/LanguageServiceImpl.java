package com.example.starter_project_2025.system.words.language;

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
        return new String[]{"name", "code"};
    }

    @Override
    protected void beforeCreate(Language entity, LanguageDTO request, ValidationContext ctx) {
        if (request.getCode() != null && languageRepository.existsByCode(request.getCode())) {
            ctx.add("code", "Language code already exists");
        }
    }

    @Override
    protected void beforeUpdate(Language entity, LanguageDTO request, ValidationContext ctx) {
        if (request.getCode() != null
                && !request.getCode().equals(entity.getCode())
                && languageRepository.existsByCodeAndIdNot(request.getCode(), entity.getId())) {
            ctx.add("code", "Language code already exists");
        }
    }
}