package com.example.starter_project_2025.domain.kanji_study.detail_word;

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
 * Vocabulary sections of the kanji detail page, keyed by kanji character:
 * the full paginated word list, recommended words (first page), and pronunciation
 * examples grouped by reading. Shares the {@code /api/kanji-details} base path
 * with {@code KanjiDetailController}.
 */
@RestController
@RequestMapping("/api/kanji-details")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Vocabulary", description = "Vocabulary linked to a kanji (Từ vựng / Từ được đề cử / Ví dụ phát âm)")
public class KanjiVocabularyController {

    KanjiVocabularyService kanjiVocabularyService;

    @GetMapping("/{character}/words")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    @Operation(summary = "Từ vựng chứa kanji (phân trang, tần suất cao trước)")
    public ResponseEntity<KanjiWordPage> words(
            @PathVariable String character,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (character == null || character.isBlank()) {
            return ResponseEntity.ok(KanjiWordPage.builder()
                    .items(List.of()).page(0).size(size).totalItems(0).totalPages(0).build());
        }
        return ResponseEntity.ok(kanjiVocabularyService.kanjiWords(
                character.trim(), Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
    }

    @GetMapping("/{character}/reading-examples")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    @Operation(summary = "Ví dụ phát âm — từ vựng nhóm theo âm đọc (on/kun) của kanji")
    public ResponseEntity<List<KanjiReadingGroup>> readingExamples(
            @PathVariable String character,
            @RequestParam(defaultValue = "200") int maxWords,
            @RequestParam(defaultValue = "8") int samples) {
        if (character == null || character.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(kanjiVocabularyService.readingExamples(
                character.trim(),
                Math.min(Math.max(maxWords, 1), 500),
                Math.min(Math.max(samples, 1), 30)));
    }

    @PostMapping("/relink-words")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_UPDATE')")
    @Operation(summary = "Liên kết lại từ vựng ↔ kanji cho các từ chưa có liên kết (chạy sau khi seed)")
    public ResponseEntity<Map<String, Integer>> relinkWords() {
        int created = kanjiVocabularyService.relinkAllMissing();
        return ResponseEntity.ok(Map.of("linksCreated", created));
    }
}
