package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.controller.BaseCrudDataIoController;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@ResourceMenu(title = "Từ vựng", group = "Tiếng Nhật", icon = "book", url = "/words", order = 1)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/words")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Word", description = "APIs for managing vocabulary words")
public class WordController
        extends BaseCrudDataIoController<Word, Long, WordDTO, WordFilter> {

    WordService wordService;
    WordRepository wordRepository;

    @Override
    protected BaseCrudService<Long, WordDTO, WordFilter> getService() {
        return wordService;
    }

    @Override
    protected BaseCrudRepository<Word, Long> getRepository() {
        return wordRepository;
    }

    @Override
    protected Class<Word> getEntityClass() {
        return Word.class;
    }

    @PostMapping("/full")
    @Operation(summary = "Tạo từ vựng kèm nhiều nghĩa (đa ngôn ngữ) và ví dụ trong một lần")
    public ResponseEntity<WordDTO> createFull(@Valid @RequestBody WordCreateRequest request) {
        return ResponseEntity.ok(wordService.createFull(request));
    }
}