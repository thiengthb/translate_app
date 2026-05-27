package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.init.annotation.ResourceMenu;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@ResourceMenu(
        title = "Từ điển",
        group = "Tiếng Nhật",
        icon = "book",
        url = "/dictionary",
        order = 1
)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dictionary")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Dictionary", description = "Tra từ tiếng Nhật từ database")
public class DictionaryController {

    DictionaryService dictionaryService;

    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm từ theo kanji, kana, romaji hoặc nghĩa")
    public ResponseEntity<List<WordSearchResult>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(dictionaryService.search(q, Math.min(limit, 50)));
    }

    @GetMapping("/suggest")
    @Operation(summary = "Gợi ý từ theo tiền tố (dùng cho autocomplete)")
    public ResponseEntity<List<WordSuggestion>> suggest(
            @RequestParam String q,
            @RequestParam(defaultValue = "8") int limit) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(dictionaryService.suggest(q, Math.min(limit, 20)));
    }
}