package com.example.starter_project_2025.system.vocabulary.level;

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
@RequestMapping("/api/levels")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Level", description = "APIs for managing proficiency levels")
public class LevelController
        extends BaseCrudDataIoController<Level, Long, LevelDTO, LevelFilter> {

    LevelService levelService;
    LevelRepository levelRepository;

    @Override
    protected BaseCrudService<Long, LevelDTO, LevelFilter> getService() {
        return levelService;
    }

    @Override
    protected BaseCrudRepository<Level, Long> getRepository() {
        return levelRepository;
    }

    @Override
    protected Class<Level> getEntityClass() {
        return Level.class;
    }
}
