package com.example.starter_project_2025.domain.kanji_study.reading_progress;

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
@RequestMapping("/api/kanji-reading-progress")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Reading Progress", description = "APIs for per-user reading set progress")
public class KanjiReadingProgressController {

    KanjiReadingProgressService kanjiReadingProgressService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_READING_PROGRESS_READ')")
    public ResponseEntity<Page<KanjiReadingProgressDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiReadingProgressFilter filter) {
        return ResponseEntity.ok(kanjiReadingProgressService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_PROGRESS_READ')")
    public ResponseEntity<KanjiReadingProgressDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiReadingProgressService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_READING_PROGRESS_CREATE')")
    public ResponseEntity<KanjiReadingProgressDTO> create(@Validated(OnCreate.class) @RequestBody KanjiReadingProgressDTO request) {
        return ResponseEntity.ok(kanjiReadingProgressService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_PROGRESS_UPDATE')")
    public ResponseEntity<KanjiReadingProgressDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiReadingProgressDTO request) {
        return ResponseEntity.ok(kanjiReadingProgressService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_PROGRESS_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiReadingProgressService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
