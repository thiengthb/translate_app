package com.example.starter_project_2025.system.words.level;

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

@ResourceMenu(title = "Cấp độ", group = "Tiếng Nhật", icon = "graduation-cap", url = "/levels", order = 5)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/levels")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Level", description = "APIs for managing JLPT levels")
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