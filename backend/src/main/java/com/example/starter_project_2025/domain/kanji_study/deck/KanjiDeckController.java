package com.example.starter_project_2025.domain.kanji_study.deck;

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
@RequestMapping("/api/kanji-decks")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Deck", description = "APIs for kanji study decks")
public class KanjiDeckController {

    KanjiDeckService kanjiDeckService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_DECK_READ')")
    public ResponseEntity<Page<KanjiDeckDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiDeckFilter filter) {
        return ResponseEntity.ok(kanjiDeckService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DECK_READ')")
    public ResponseEntity<KanjiDeckDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiDeckService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_DECK_CREATE')")
    public ResponseEntity<KanjiDeckDTO> create(@Validated(OnCreate.class) @RequestBody KanjiDeckDTO request) {
        return ResponseEntity.ok(kanjiDeckService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DECK_UPDATE')")
    public ResponseEntity<KanjiDeckDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiDeckDTO request) {
        return ResponseEntity.ok(kanjiDeckService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DECK_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiDeckService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
