package com.example.starter_project_2025.domain.kanji_study.reading_passage;

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
@RequestMapping("/api/kanji-reading-passages")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Reading Passage", description = "APIs for reading passages")
public class KanjiReadingPassageController {

    KanjiReadingPassageService kanjiReadingPassageService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_READING_PASSAGE_READ')")
    public ResponseEntity<Page<KanjiReadingPassageDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiReadingPassageFilter filter) {
        return ResponseEntity.ok(kanjiReadingPassageService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_PASSAGE_READ')")
    public ResponseEntity<KanjiReadingPassageDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiReadingPassageService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_READING_PASSAGE_CREATE')")
    public ResponseEntity<KanjiReadingPassageDTO> create(@Validated(OnCreate.class) @RequestBody KanjiReadingPassageDTO request) {
        return ResponseEntity.ok(kanjiReadingPassageService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_PASSAGE_UPDATE')")
    public ResponseEntity<KanjiReadingPassageDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiReadingPassageDTO request) {
        return ResponseEntity.ok(kanjiReadingPassageService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_READING_PASSAGE_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiReadingPassageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
