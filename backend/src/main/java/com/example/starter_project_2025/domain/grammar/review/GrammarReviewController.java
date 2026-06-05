package com.example.starter_project_2025.domain.grammar.review;

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
@RequestMapping("/api/grammar")
@RequiredArgsConstructor
@Tag(name = "GrammarReview", description = "Grammar SRS review (grade + schedule)")
@SecurityRequirement(name = "bearerAuth")
public class GrammarReviewController {

    private final GrammarReviewService reviewService;

    @PostMapping("/review")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_CREATE')")
    @Operation(summary = "Grade a production answer and advance its SRS schedule")
    public ResponseEntity<GrammarReviewResponse> review(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody GrammarReviewRequest req) {

        return ResponseEntity.ok(
                reviewService.review(principal.getId(), req.getPromptId(), req.getAnswer()));
    }
}
