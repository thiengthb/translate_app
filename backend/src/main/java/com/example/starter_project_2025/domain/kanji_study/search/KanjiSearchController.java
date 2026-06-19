package com.example.starter_project_2025.domain.kanji_study.search;

import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetailDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Relevance-ranked kanji search ("CHỮ HÁN" tab). Shares the
 * {@code /api/kanji-details} base path; the literal {@code /search} is matched
 * ahead of the auto-CRUD {@code /{id}} handler.
 */
@RestController
@RequestMapping("/api/kanji-details")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Search", description = "Tìm chữ Hán theo nghĩa / âm đọc / romaji (xếp hạng độ liên quan)")
public class KanjiSearchController {

    KanjiSearchService kanjiSearchService;

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    @Operation(summary = "Tìm chữ Hán theo nghĩa (đúng từ), âm đọc on/kun, romaji hoặc Hán-Việt")
    public ResponseEntity<Page<KanjiDetailDTO>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(kanjiSearchService.search(q, page, size));
    }
}
