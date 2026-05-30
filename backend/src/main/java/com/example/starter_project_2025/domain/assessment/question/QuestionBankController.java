package com.example.starter_project_2025.domain.assessment.question;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
