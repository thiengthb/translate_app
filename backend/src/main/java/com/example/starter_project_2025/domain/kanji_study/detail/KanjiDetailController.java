package com.example.starter_project_2025.domain.kanji_study.detail;

import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.base.crud.dto.OnUpdate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kanji-details")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Detail", description = "APIs for kanji form/etymology details")
public class KanjiDetailController {

    KanjiDetailService kanjiDetailService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    public ResponseEntity<Page<KanjiDetailDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiDetailFilter filter) {
        return ResponseEntity.ok(kanjiDetailService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    public ResponseEntity<KanjiDetailDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiDetailService.getById(id));
    }

    @GetMapping("/by-component/{component}")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    @Operation(summary = "Hán tự chứa một thành phần chiết tự (element/original trong cây KanjiVG)")
    public ResponseEntity<Page<KanjiDetailDTO>> byComponent(
            @PathVariable String component,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        if (component == null || component.isBlank()) {
            return ResponseEntity.ok(Page.empty());
        }
        return ResponseEntity.ok(kanjiDetailService.findByComponent(
                component.trim(),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 60))));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_DETAIL_CREATE')")
    public ResponseEntity<KanjiDetailDTO> create(@Validated(OnCreate.class) @RequestBody KanjiDetailDTO request) {
        return ResponseEntity.ok(kanjiDetailService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_UPDATE')")
    public ResponseEntity<KanjiDetailDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiDetailDTO request) {
        return ResponseEntity.ok(kanjiDetailService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiDetailService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
