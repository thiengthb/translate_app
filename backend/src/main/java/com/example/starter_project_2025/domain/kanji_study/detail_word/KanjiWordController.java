package com.example.starter_project_2025.domain.kanji_study.detail_word;

import com.example.starter_project_2025.domain.kanji_study.detail_sentence.KanjiSentencePage;
import com.example.starter_project_2025.domain.kanji_study.detail_sentence.KanjiSentenceService;
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
 * Word-centric endpoints for Kanji Study: search ("Tìm kiếm" → Từ vựng tab),
 * the word detail page (word + meanings + kanji breakdown), and example
 * sentences containing the word. Read-only over the shared dictionary
 * {@code words} table (never writes it); reuses {@code KANJI_DETAIL_READ}.
 */
@RestController
@RequestMapping("/api/kanji-words")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Words", description = "Tìm kiếm từ vựng + trang chi tiết từ (Kanji Study)")
public class KanjiWordController {

    KanjiVocabularyService kanjiVocabularyService;
    KanjiSentenceService kanjiSentenceService;

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    @Operation(summary = "Tìm từ vựng theo chữ / âm đọc / nghĩa (tần suất cao trước)")
    public ResponseEntity<KanjiWordPage> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(kanjiVocabularyService.searchWords(
                q, Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    @Operation(summary = "Chi tiết một từ: nghĩa đầy đủ + các chữ Hán trong từ")
    public ResponseEntity<KanjiWordDetail> detail(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiVocabularyService.wordDetail(id));
    }

    @GetMapping("/{id}/sentences")
    @PreAuthorize("hasAuthority('KANJI_DETAIL_READ')")
    @Operation(summary = "Câu ví dụ chứa từ (phân trang, câu ngắn trước)")
    public ResponseEntity<KanjiSentencePage> sentences(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        KanjiWordDetail word = kanjiVocabularyService.wordDetail(id);
        if (word.getWord() == null || word.getWord().isBlank()) {
            return ResponseEntity.ok(KanjiSentencePage.builder()
                    .items(List.of()).page(0).size(size).totalItems(0).totalPages(0).build());
        }
        return ResponseEntity.ok(kanjiSentenceService.sentencesContaining(
                word.getWord(), Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
    }
}
