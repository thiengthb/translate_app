package com.example.starter_project_2025.domain.kanji_study.progress;

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
@RequestMapping("/api/kanji-progress")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Progress", description = "APIs for per-user kanji learning progress")
public class KanjiProgressController {

    KanjiProgressService kanjiProgressService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_PROGRESS_READ')")
    public ResponseEntity<Page<KanjiProgressDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiProgressFilter filter) {
        return ResponseEntity.ok(kanjiProgressService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_PROGRESS_READ')")
    public ResponseEntity<KanjiProgressDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiProgressService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_PROGRESS_CREATE')")
    public ResponseEntity<KanjiProgressDTO> create(@Validated(OnCreate.class) @RequestBody KanjiProgressDTO request) {
        return ResponseEntity.ok(kanjiProgressService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_PROGRESS_UPDATE')")
    public ResponseEntity<KanjiProgressDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiProgressDTO request) {
        return ResponseEntity.ok(kanjiProgressService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_PROGRESS_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiProgressService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
