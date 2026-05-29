package com.example.starter_project_2025.domain.library.srs.algorithm_config;

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
public class SrsAlgorithmConfigServiceImpl
        extends BaseCrudServiceImpl<SrsAlgorithmConfig, Long, SrsAlgorithmConfigDTO, SrsAlgorithmConfigFilter>
        implements SrsAlgorithmConfigService {

    SrsAlgorithmConfigMapper mapper;
    SrsAlgorithmConfigRepository repository;

    @Override
    protected BaseCrudRepository<SrsAlgorithmConfig, Long> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<SrsAlgorithmConfig, SrsAlgorithmConfigDTO> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"code", "name"};
    }

    @Override
    protected void beforeCreate(SrsAlgorithmConfig entity, SrsAlgorithmConfigDTO request, ValidationContext ctx) {
        if (repository.existsByCode(request.getCode())) {
            ctx.add("code", "Algorithm config code already exists");
        }
    }

    @Override
    protected void beforeUpdate(SrsAlgorithmConfig entity, SrsAlgorithmConfigDTO request, ValidationContext ctx) {
        if (request.getCode() != null && !request.getCode().equals(entity.getCode())
                && repository.existsByCodeAndIdNot(request.getCode(), entity.getId())) {
            ctx.add("code", "Algorithm config code already exists");
        }
    }
}
