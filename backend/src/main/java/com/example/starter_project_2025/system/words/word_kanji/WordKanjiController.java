package com.example.starter_project_2025.system.words.word_kanji;

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

@ResourceMenu(title = "Từ - Kanji", group = "Tiếng Nhật", icon = "link", url = "/word-kanjis", order = 7)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/word-kanjis")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "WordKanji", description = "APIs for managing word-kanji associations")
public class WordKanjiController
        extends BaseCrudDataIoController<WordKanji, Long, WordKanjiDTO, WordKanjiFilter> {

    WordKanjiService wordKanjiService;
    WordKanjiRepository wordKanjiRepository;

    @Override
    protected BaseCrudService<Long, WordKanjiDTO, WordKanjiFilter> getService() {
        return wordKanjiService;
    }

    @Override
    protected BaseCrudRepository<WordKanji, Long> getRepository() {
        return wordKanjiRepository;
    }

    @Override
    protected Class<WordKanji> getEntityClass() {
        return WordKanji.class;
    }
}