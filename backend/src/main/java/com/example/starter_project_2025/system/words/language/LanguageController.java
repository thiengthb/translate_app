package com.example.starter_project_2025.system.words.language;

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

@ResourceMenu(title = "Ngôn ngữ", group = "Tiếng Nhật", icon = "languages", url = "/languages", order = 6)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/languages")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Language", description = "APIs for managing languages")
public class LanguageController
        extends BaseCrudDataIoController<Language, Long, LanguageDTO, LanguageFilter> {

    LanguageService languageService;
    LanguageRepository languageRepository;

    @Override
    protected BaseCrudService<Long, LanguageDTO, LanguageFilter> getService() {
        return languageService;
    }

    @Override
    protected BaseCrudRepository<Language, Long> getRepository() {
        return languageRepository;
    }

    @Override
    protected Class<Language> getEntityClass() {
        return Language.class;
    }
}