package com.example.starter_project_2025.domain.kanji_study.radical;

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
@RequestMapping("/api/kanji-radicals")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Radical", description = "APIs for Kangxi radicals (bộ thủ)")
public class KanjiRadicalController {

    KanjiRadicalService kanjiRadicalService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_RADICAL_READ')")
    public ResponseEntity<Page<KanjiRadicalDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiRadicalFilter filter) {
        return ResponseEntity.ok(kanjiRadicalService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_RADICAL_READ')")
    public ResponseEntity<KanjiRadicalDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiRadicalService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_RADICAL_CREATE')")
    public ResponseEntity<KanjiRadicalDTO> create(@Validated(OnCreate.class) @RequestBody KanjiRadicalDTO request) {
        return ResponseEntity.ok(kanjiRadicalService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_RADICAL_UPDATE')")
    public ResponseEntity<KanjiRadicalDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiRadicalDTO request) {
        return ResponseEntity.ok(kanjiRadicalService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_RADICAL_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiRadicalService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
