package com.example.starter_project_2025.domain.kanji_study.session_item;

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
@RequestMapping("/api/kanji-session-items")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Session Item", description = "APIs for kanji study session items")
public class KanjiSessionItemController {

    KanjiSessionItemService kanjiSessionItemService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_SESSION_ITEM_READ')")
    public ResponseEntity<Page<KanjiSessionItemDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiSessionItemFilter filter) {
        return ResponseEntity.ok(kanjiSessionItemService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_SESSION_ITEM_READ')")
    public ResponseEntity<KanjiSessionItemDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiSessionItemService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_SESSION_ITEM_CREATE')")
    public ResponseEntity<KanjiSessionItemDTO> create(@Validated(OnCreate.class) @RequestBody KanjiSessionItemDTO request) {
        return ResponseEntity.ok(kanjiSessionItemService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_SESSION_ITEM_UPDATE')")
    public ResponseEntity<KanjiSessionItemDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiSessionItemDTO request) {
        return ResponseEntity.ok(kanjiSessionItemService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_SESSION_ITEM_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiSessionItemService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
