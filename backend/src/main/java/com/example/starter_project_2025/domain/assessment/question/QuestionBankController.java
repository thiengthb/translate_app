package com.example.starter_project_2025.domain.assessment.question;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/questions")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuestionBank", description = "Question bank + options management")
public class QuestionBankController {

    QuestionBankService questionBankService;

    @PostMapping("/{id}/options")
    public ResponseEntity<QuestionOptionDTO> addOption(
            @PathVariable Long id,
            @Valid @RequestBody QuestionOptionDTO request
    ) {
        return ResponseEntity.ok(questionBankService.addOption(id, request));
    }

    @DeleteMapping("/{id}/options/{optionId}")
    public ResponseEntity<Void> removeOption(
            @PathVariable Long id,
            @PathVariable Long optionId
    ) {
        questionBankService.removeOption(optionId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/options/reorder")
    public ResponseEntity<Void> reorderOptions(
            @PathVariable Long id,
            @RequestBody List<Long> orderedOptionIds
    ) {
        questionBankService.reorderOptions(id, orderedOptionIds);
        return ResponseEntity.noContent().build();
    }

    /* ── Version (audit) ── */

    @GetMapping("/{id}/version")
    public ResponseEntity<Map<String, Object>> getVersion(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of(
                "questionId", id,
                "currentVersion", questionBankService.getCurrentVersion(id)
        ));
    }

    /* ── Tags ── */

    @PostMapping("/{id}/tags")
    public ResponseEntity<Void> addTags(
            @PathVariable Long id,
            @RequestBody AddTagsRequest request
    ) {
        questionBankService.addTags(id, request.tagIds());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public ResponseEntity<Void> removeTag(
            @PathVariable Long id,
            @PathVariable Long tagId
    ) {
        questionBankService.removeTag(id, tagId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-tags")
    public ResponseEntity<List<QuestionBankDTO>> findByTags(
            @RequestParam List<Long> tagIds,
            @RequestParam(defaultValue = "false") boolean matchAll
    ) {
        return ResponseEntity.ok(questionBankService.findByTags(tagIds, matchAll));
    }

    public record AddTagsRequest(List<Long> tagIds) {
    }
}
