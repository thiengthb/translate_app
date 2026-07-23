package com.example.starter_project_2025.domain.kanji_study.detail_sentence;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * The "Câu" (example sentences) section of the kanji detail page, keyed by kanji
 * character. Shares the {@code /api/kanji-details} base path with
 * {@code KanjiDetailController} / {@code KanjiVocabularyController} and reuses the
 * {@code KANJI_DETAIL_READ} permission.
 */
@RestController
@RequestMapping("/api/kanji-details")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Sentences", description = "Câu ví dụ chứa kanji (furigana + bản dịch)")
public class KanjiSentenceController {

    KanjiSentenceService kanjiSentenceService;
    KanjiSentenceImportService kanjiSentenceImportService;
    KanjiSentenceTranslationService kanjiSentenceTranslationService;

    @GetMapping("/{character}/sentences")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    @Operation(summary = "Câu ví dụ chứa kanji (phân trang, câu ngắn trước)")
    public ResponseEntity<KanjiSentencePage> sentences(
            @PathVariable String character,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (character == null || character.isBlank()) {
            return ResponseEntity.ok(KanjiSentencePage.builder()
                    .items(List.of()).page(0).size(size).totalItems(0).totalPages(0).build());
        }
        return ResponseEntity.ok(kanjiSentenceService.kanjiSentences(
                character.trim(), Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
    }

    @PostMapping("/reimport-sentences")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_UPDATE')")
    @Operation(summary = "Nạp lại câu ví dụ từ seed file (xoá dữ liệu cũ; chạy sau khi regenerate)")
    public ResponseEntity<Map<String, Integer>> reimport() {
        KanjiSentenceImportService.ImportResult r = kanjiSentenceImportService.importFromSeed(true);
        return ResponseEntity.ok(Map.of(
                "sentences", r.sentences(),
                "links", r.links(),
                "kanji", r.kanji()));
    }

    @PostMapping("/translate-sentences-vi")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_UPDATE')")
    @Operation(summary = "Dịch câu ví dụ sang tiếng Việt bằng Gemini (chỉ câu thiếu VI; chạy lại tới khi remaining=0)")
    public ResponseEntity<Map<String, Object>> translateVi(
            @RequestParam(defaultValue = "200") int limit,
            @RequestParam(defaultValue = "30") int batch) {
        // Batch cap 200: free-tier Gemini is request-limited, not token-limited, so
        // packing more sentences per request is how the full corpus fits in a day.
        return ResponseEntity.ok(kanjiSentenceTranslationService.translateMissingVi(
                Math.min(Math.max(limit, 1), 5000),
                Math.min(Math.max(batch, 1), 200)));
    }
}
