package com.example.starter_project_2025.domain.kanji_study.session;

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
@RequestMapping("/api/kanji-study-sessions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Study Session", description = "APIs for kanji study sessions")
public class KanjiStudySessionController {

    KanjiStudySessionService kanjiStudySessionService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_STUDY_SESSION_READ')")
    public ResponseEntity<Page<KanjiStudySessionDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiStudySessionFilter filter) {
        return ResponseEntity.ok(kanjiStudySessionService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_STUDY_SESSION_READ')")
    public ResponseEntity<KanjiStudySessionDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiStudySessionService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_STUDY_SESSION_CREATE')")
    public ResponseEntity<KanjiStudySessionDTO> create(@Validated(OnCreate.class) @RequestBody KanjiStudySessionDTO request) {
        return ResponseEntity.ok(kanjiStudySessionService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_STUDY_SESSION_UPDATE')")
    public ResponseEntity<KanjiStudySessionDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiStudySessionDTO request) {
        return ResponseEntity.ok(kanjiStudySessionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_STUDY_SESSION_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiStudySessionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
