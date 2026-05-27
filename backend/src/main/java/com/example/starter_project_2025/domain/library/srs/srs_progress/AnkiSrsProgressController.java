package com.example.starter_project_2025.domain.library.srs.srs_progress;

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
@RequestMapping("/api/anki/srs-progress")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "AnkiSrsProgress", description = "APIs for managing per-user-deck-card SRS progress")
public class AnkiSrsProgressController
        extends BaseCrudDataIoController<AnkiSrsProgress, Long, AnkiSrsProgressDTO, AnkiSrsProgressFilter> {

    AnkiSrsProgressService ankiSrsProgressService;
    AnkiSrsProgressRepository ankiSrsProgressRepository;

    @Override
    protected BaseCrudService<Long, AnkiSrsProgressDTO, AnkiSrsProgressFilter> getService() {
        return ankiSrsProgressService;
    }

    @Override
    protected BaseCrudRepository<AnkiSrsProgress, Long> getRepository() {
        return ankiSrsProgressRepository;
    }

    @Override
    protected Class<AnkiSrsProgress> getEntityClass() {
        return AnkiSrsProgress.class;
    }
}
