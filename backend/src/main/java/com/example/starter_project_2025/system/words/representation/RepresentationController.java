package com.example.starter_project_2025.system.words.representation;

import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@ResourceMenu(title = "Kiểu chữ", group = "Tiếng Nhật", icon = "type", url = "/representations", order = 4)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/representations")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Representation", description = "APIs for managing script representations")
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