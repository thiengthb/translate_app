package com.example.starter_project_2025.system.words.kanji;

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

@ResourceMenu(title = "Kanji", group = "Tiếng Nhật", icon = "book-open", url = "/kanjis", order = 2)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/kanjis")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji", description = "APIs for managing kanji characters")
public class KanjiController
        extends BaseCrudDataIoController<Kanji, Long, KanjiDTO, KanjiFilter> {

    KanjiService kanjiService;
    KanjiRepository kanjiRepository;

    @Override
    protected BaseCrudService<Long, KanjiDTO, KanjiFilter> getService() {
        return kanjiService;
    }

    @Override
    protected BaseCrudRepository<Kanji, Long> getRepository() {
        return kanjiRepository;
    }

    @Override
    protected Class<Kanji> getEntityClass() {
        return Kanji.class;
    }
}