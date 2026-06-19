package com.example.starter_project_2025.domain.kanji_study.session;

import com.example.starter_project_2025.domain.kanji_study.session.KanjiStudyService.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Save a finished study session + read per deck/group stats. Shares the
 * {@code /api/kanji-study-sessions} base path with the auto-CRUD handler; the
 * literal {@code /submit} and {@code /stats} are matched ahead of {@code /{id}}.
 */
@RestController
@RequestMapping("/api/kanji-study-sessions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Study", description = "Lưu phiên học + thống kê (Trắc nghiệm / Flashcard)")
public class KanjiStudyController {

    KanjiStudyService kanjiStudyService;

    @PostMapping("/submit")
    @PreAuthorize("hasAuthority('KANJI_STUDY_SESSION_CREATE')")
    @Operation(summary = "Lưu một phiên học đã hoàn thành (session + items + cập nhật tiến độ)")
    public ResponseEntity<SubmitResult> submit(@RequestBody SubmitRequest request) {
        return ResponseEntity.ok(kanjiStudyService.submit(request));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('KANJI_STUDY_SESSION_READ')")
    @Operation(summary = "Thống kê theo deck/nhóm/chế độ: lần học cuối, số phiên, độ chính xác")
    public ResponseEntity<StatsResult> stats(
            @RequestParam(required = false) Long deckId,
            @RequestParam(required = false) Integer groupIndex,
            @RequestParam(required = false) String mode) {
        return ResponseEntity.ok(kanjiStudyService.stats(deckId, groupIndex, mode));
    }

    @GetMapping("/recent")
    @PreAuthorize("hasAuthority('KANJI_STUDY_SESSION_READ')")
    @Operation(summary = "Các phiên học gần đây của người dùng (hiện trên màn hình chính)")
    public ResponseEntity<List<RecentSession>> recent(@RequestParam(defaultValue = "6") int limit) {
        return ResponseEntity.ok(kanjiStudyService.recent(limit));
    }
}
