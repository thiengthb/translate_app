package com.example.starter_project_2025.domain.kanji_study.reading_set;

import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.base.crud.dto.OnUpdate;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kanji-reading-sets")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Reading Set", description = "APIs for graded reading sets")
public class KanjiReadingSetController {

    KanjiReadingSetService kanjiReadingSetService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_READING_SET_READ')")
    public ResponseEntity<Page<KanjiReadingSetDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiReadingSetFilter filter) {
        return ResponseEntity.ok(kanjiReadingSetService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_SET_READ')")
    public ResponseEntity<KanjiReadingSetDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiReadingSetService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_READING_SET_CREATE')")
    public ResponseEntity<KanjiReadingSetDTO> create(@Validated(OnCreate.class) @RequestBody KanjiReadingSetDTO request) {
        return ResponseEntity.ok(kanjiReadingSetService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_SET_UPDATE')")
    public ResponseEntity<KanjiReadingSetDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiReadingSetDTO request) {
        return ResponseEntity.ok(kanjiReadingSetService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_SET_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiReadingSetService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
