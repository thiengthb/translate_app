package com.example.starter_project_2025.domain.kanji_study.deck_item;

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
@RequestMapping("/api/kanji-deck-items")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Deck Item", description = "APIs for kanji deck membership")
public class KanjiDeckItemController {

    KanjiDeckItemService kanjiDeckItemService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_READ')")
    public ResponseEntity<Page<KanjiDeckItemDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiDeckItemFilter filter) {
        return ResponseEntity.ok(kanjiDeckItemService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_READ')")
    public ResponseEntity<KanjiDeckItemDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiDeckItemService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_CREATE')")
    public ResponseEntity<KanjiDeckItemDTO> create(@Validated(OnCreate.class) @RequestBody KanjiDeckItemDTO request) {
        return ResponseEntity.ok(kanjiDeckItemService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_UPDATE')")
    public ResponseEntity<KanjiDeckItemDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiDeckItemDTO request) {
        return ResponseEntity.ok(kanjiDeckItemService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DECK_ITEM_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiDeckItemService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
