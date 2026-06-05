package com.example.starter_project_2025.domain.kanji_study.writing_attempt;

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
@RequestMapping("/api/kanji-writing-attempts")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Writing Attempt", description = "APIs for kanji handwriting practice attempts")
public class KanjiWritingAttemptController {

    KanjiWritingAttemptService kanjiWritingAttemptService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_WRITING_ATTEMPT_READ')")
    public ResponseEntity<Page<KanjiWritingAttemptDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiWritingAttemptFilter filter) {
        return ResponseEntity.ok(kanjiWritingAttemptService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_WRITING_ATTEMPT_READ')")
    public ResponseEntity<KanjiWritingAttemptDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiWritingAttemptService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_WRITING_ATTEMPT_CREATE')")
    public ResponseEntity<KanjiWritingAttemptDTO> create(@Validated(OnCreate.class) @RequestBody KanjiWritingAttemptDTO request) {
        return ResponseEntity.ok(kanjiWritingAttemptService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_WRITING_ATTEMPT_UPDATE')")
    public ResponseEntity<KanjiWritingAttemptDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiWritingAttemptDTO request) {
        return ResponseEntity.ok(kanjiWritingAttemptService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_WRITING_ATTEMPT_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiWritingAttemptService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
