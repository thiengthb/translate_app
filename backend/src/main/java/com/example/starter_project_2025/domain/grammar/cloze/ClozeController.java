package com.example.starter_project_2025.domain.grammar.cloze;

import com.example.starter_project_2025.domain.grammar.cloze.ClozeDTOs.*;
import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/grammar/cloze")
@RequiredArgsConstructor
@Tag(name = "GrammarCloze", description = "Bunpro-style fill-in-the-blank grammar drill")
@SecurityRequirement(name = "bearerAuth")
public class ClozeController {

    private final ClozeService clozeService;

    @GetMapping("/{subUseId}")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_READ')")
    @Operation(summary = "Get a cloze question (reference sentence with the grammar masked)")
    public ResponseEntity<ClozeQuestion> question(@PathVariable Long subUseId) {
        return ResponseEntity.ok(clozeService.question(subUseId));
    }

    @PostMapping("/review")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_CREATE')")
    @Operation(summary = "Grade a cloze answer and advance the SRS schedule")
    public ResponseEntity<ClozeResult> review(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ClozeReviewRequest req) {
        return ResponseEntity.ok(clozeService.review(
                principal.getId(), req.getReferenceSentenceId(), req.getAnswer(), req.getAttemptNo()));
    }
}
