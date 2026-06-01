package com.example.starter_project_2025.system.words.representation;

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
public class RepresentationServiceImpl
        extends BaseCrudServiceImpl<Representation, Long, RepresentationDTO, RepresentationFilter>
        implements RepresentationService {

    RepresentationMapper representationMapper;
    RepresentationRepository representationRepository;

    @Override
    protected BaseCrudRepository<Representation, Long> getRepository() {
        return representationRepository;
    }

    @Override
    protected BaseCrudMapper<Representation, RepresentationDTO> getMapper() {
        return representationMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name", "code"};
    }

    @Override
    protected void beforeCreate(Representation entity, RepresentationDTO request, ValidationContext ctx) {
        if (request.getCode() != null && representationRepository.existsByCode(request.getCode())) {
            ctx.add("code", "Representation code already exists");
        }
    }

    @Override
    protected void beforeUpdate(Representation entity, RepresentationDTO request, ValidationContext ctx) {
        if (request.getCode() != null
                && !request.getCode().equals(entity.getCode())
                && representationRepository.existsByCodeAndIdNot(request.getCode(), entity.getId())) {
            ctx.add("code", "Representation code already exists");
        }
    }
}