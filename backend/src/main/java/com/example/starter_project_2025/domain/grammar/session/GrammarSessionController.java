package com.example.starter_project_2025.domain.grammar.session;

import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/grammar")
@RequiredArgsConstructor
@Tag(name = "GrammarSession", description = "Continue Learning session builder")
@SecurityRequirement(name = "bearerAuth")
public class GrammarSessionController {

    private final GrammarSessionService sessionService;

    @GetMapping("/session")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_READ')")
    @Operation(summary = "Build a Continue Learning session (due reviews + new grammar)")
    public ResponseEntity<GrammarSessionResponse> session(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String level,
            @RequestParam(defaultValue = "false") boolean extra) {

        return ResponseEntity.ok(sessionService.build(principal.getId(), level, extra));
    }
}
