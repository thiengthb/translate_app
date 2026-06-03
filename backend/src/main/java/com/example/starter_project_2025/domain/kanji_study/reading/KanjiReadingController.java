package com.example.starter_project_2025.domain.kanji_study.reading;

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
@RequestMapping("/api/kanji-readings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Reading", description = "APIs for kanji Hán-Việt / nanori readings")
public class KanjiReadingController {

    KanjiReadingService kanjiReadingService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_READING_READ')")
    public ResponseEntity<Page<KanjiReadingDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiReadingFilter filter) {
        return ResponseEntity.ok(kanjiReadingService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_READ')")
    public ResponseEntity<KanjiReadingDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiReadingService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_READING_CREATE')")
    public ResponseEntity<KanjiReadingDTO> create(@Validated(OnCreate.class) @RequestBody KanjiReadingDTO request) {
        return ResponseEntity.ok(kanjiReadingService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_UPDATE')")
    public ResponseEntity<KanjiReadingDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiReadingDTO request) {
        return ResponseEntity.ok(kanjiReadingService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiReadingService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
