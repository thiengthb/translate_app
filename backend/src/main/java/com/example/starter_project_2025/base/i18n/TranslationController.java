package com.example.starter_project_2025.base.i18n;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/i18n")
@RequiredArgsConstructor
public class TranslationController {

    private final TranslationService translationService;

    @GetMapping("/{locale}")
    public ResponseEntity<Map<String, String>> getTranslations(
            @PathVariable String locale,
            @RequestParam(required = false) String category) {
        if (category != null && !category.isBlank()) {
            return ResponseEntity.ok(translationService.getTranslations(locale, category));
        }
        return ResponseEntity.ok(translationService.getTranslations(locale));
    }
}
