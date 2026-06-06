package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.words.level.Level;
import com.example.starter_project_2025.system.words.level.LevelRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Grammar expression CRUD with one business hook: resolve the {@code levelId}
 * on the DTO into the managed {@link Level} relation (mirrors {@code WordServiceImpl}).
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GrammarServiceImpl
        extends BaseCrudServiceImpl<Grammar, Long, GrammarDTO, BaseFilter> {

    GrammarMapper grammarMapper;
    GrammarRepository grammarRepository;
    LevelRepository levelRepository;

    @Override
    protected BaseCrudRepository<Grammar, Long> getRepository() {
        return grammarRepository;
    }

    @Override
    protected BaseCrudMapper<Grammar, GrammarDTO> getMapper() {
        return grammarMapper;
    }

    @Override
    protected void beforeCreate(Grammar entity, GrammarDTO request, ValidationContext ctx) {
        resolveLevel(entity, request);
    }

    @Override
    protected void beforeUpdate(Grammar entity, GrammarDTO request, ValidationContext ctx) {
        resolveLevel(entity, request);
    }

    private void resolveLevel(Grammar entity, GrammarDTO request) {
        if (request.getLevelId() != null) {
            Level level = levelRepository.findById(request.getLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Level not found"));
            entity.setLevel(level);
        }
    }
}
