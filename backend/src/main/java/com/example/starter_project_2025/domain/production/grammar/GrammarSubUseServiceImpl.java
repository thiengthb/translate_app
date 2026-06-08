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
 * Grammar-usage CRUD with one business hook: resolve the {@code levelId} on the
 * DTO into the managed {@link Level} relation (mirrors {@code WordServiceImpl}).
 * The parent {@code grammar} relation is intentionally never touched here — it is
 * set server-side by the backfill — so editing a usage cannot orphan it.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GrammarSubUseServiceImpl
        extends BaseCrudServiceImpl<GrammarSubUse, Long, GrammarSubUseDTO, BaseFilter> {

    GrammarSubUseMapper grammarSubUseMapper;
    GrammarSubUseRepository grammarSubUseRepository;
    LevelRepository levelRepository;

    @Override
    protected BaseCrudRepository<GrammarSubUse, Long> getRepository() {
        return grammarSubUseRepository;
    }

    @Override
    protected BaseCrudMapper<GrammarSubUse, GrammarSubUseDTO> getMapper() {
        return grammarSubUseMapper;
    }

    @Override
    protected void beforeCreate(GrammarSubUse entity, GrammarSubUseDTO request, ValidationContext ctx) {
        resolveLevel(entity, request);
    }

    @Override
    protected void beforeUpdate(GrammarSubUse entity, GrammarSubUseDTO request, ValidationContext ctx) {
        resolveLevel(entity, request);
    }

    private void resolveLevel(GrammarSubUse entity, GrammarSubUseDTO request) {
        if (request.getLevelId() != null) {
            Level level = levelRepository.findById(request.getLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Level not found"));
            entity.setLevel(level);
        }
    }
}
