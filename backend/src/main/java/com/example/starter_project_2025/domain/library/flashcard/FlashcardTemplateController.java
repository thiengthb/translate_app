package com.example.starter_project_2025.domain.library.flashcard;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/flashcard-templates")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "FlashcardTemplate", description = "APIs for managing flashcard templates")
public class FlashcardTemplateController {

    FlashcardTemplateService flashcardTemplateService;

    /* ─────────────────────────────────────────
       Default template lookup
    ───────────────────────────────────────── */

    @GetMapping("/default")
    public ResponseEntity<FlashcardTemplateDTO> getDefault(@RequestParam String cardType) {
        return ResponseEntity.ok(flashcardTemplateService.getDefaultTemplate(cardType));
    }
}
