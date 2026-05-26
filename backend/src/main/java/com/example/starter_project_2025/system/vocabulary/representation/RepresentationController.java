package com.example.starter_project_2025.system.vocabulary.representation;

import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/representations")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Representation", description = "APIs for managing writing system representations")
public class RepresentationController
        extends BaseCrudDataIoController<Representation, Long, RepresentationDTO, RepresentationFilter> {

    RepresentationService representationService;
    RepresentationRepository representationRepository;

    @Override
    protected BaseCrudService<Long, RepresentationDTO, RepresentationFilter> getService() {
        return representationService;
    }

    @Override
    protected BaseCrudRepository<Representation, Long> getRepository() {
        return representationRepository;
    }

    @Override
    protected Class<Representation> getEntityClass() {
        return Representation.class;
    }
}
