package com.example.starter_project_2025.system.words.level;

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
public class LevelServiceImpl
        extends BaseCrudServiceImpl<Level, Long, LevelDTO, LevelFilter>
        implements LevelService {

    LevelMapper levelMapper;
    LevelRepository levelRepository;

    @Override
    protected BaseCrudRepository<Level, Long> getRepository() {
        return levelRepository;
    }

    @Override
    protected BaseCrudMapper<Level, LevelDTO> getMapper() {
        return levelMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name", "code"};
    }

    @Override
    protected void beforeCreate(Level entity, LevelDTO request, ValidationContext ctx) {
        if (request.getCode() != null && levelRepository.existsByCode(request.getCode())) {
            ctx.add("code", "Level code already exists");
        }
    }

    @Override
    protected void beforeUpdate(Level entity, LevelDTO request, ValidationContext ctx) {
        if (request.getCode() != null
                && !request.getCode().equals(entity.getCode())
                && levelRepository.existsByCodeAndIdNot(request.getCode(), entity.getId())) {
            ctx.add("code", "Level code already exists");
        }
    }
}