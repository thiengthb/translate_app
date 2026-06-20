package com.example.starter_project_2025.domain.grammar.dashboard;

import com.example.starter_project_2025.domain.grammar.dashboard.GrammarDashboardDTOs.*;
import com.example.starter_project_2025.domain.grammar.goal.GrammarGoalDTOs.GoalSnapshot;
import com.example.starter_project_2025.domain.grammar.goal.GrammarGoalDTOs.GoalUpdateRequest;
import com.example.starter_project_2025.domain.grammar.goal.GrammarGoalService;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.analyze.FuriganaService;
import com.example.starter_project_2025.system.analyze.FuriganaService.RubySegment;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Learner-facing dashboard + progress endpoints. Mounted under {@code /api/grammar/learn}
 * to stay clear of the auto-CRUD namespace {@code /api/grammar/progress}.
 */
@RestController
@RequestMapping("/api/grammar/learn")
@RequiredArgsConstructor
@Tag(name = "GrammarDashboard", description = "Grammar learning dashboard & progress")
@SecurityRequirement(name = "bearerAuth")
@ResourceMenu(
        title = "Ngữ pháp",
        group = "Grammar Learning",
        icon = "graduation-cap",
        url = "/grammar",
        description = "Học ngữ pháp theo lộ trình + ôn tập SRS.",
        order = 0,
        permission = "GRAMMAR_PROGRESS_READ"
)
public class GrammarDashboardController {

    private final GrammarDashboardService dashboardService;
    private final GrammarGoalService goalService;
    private final FuriganaService furiganaService;

    /** Batch furigana request: each input string becomes one list of ruby segments. */
    public record FuriganaRequest(List<String> texts) {}

    @GetMapping("/goal")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_READ')")
    @Operation(summary = "Get the daily learning goal + today's progress against it")
    public ResponseEntity<GoalSnapshot> getGoal(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(goalService.snapshot(principal.getId()));
    }

    @PutMapping("/goal")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_UPDATE')")
    @Operation(summary = "Update the daily learning goal (new + reviews per day)")
    public ResponseEntity<GoalSnapshot> updateGoal(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody GoalUpdateRequest req) {
        return ResponseEntity.ok(
                goalService.update(principal.getId(), req.getNewPerDay(), req.getReviewsPerDay()));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_READ')")
    @Operation(summary = "Per-JLPT-level progress summary (home screen)")
    public ResponseEntity<List<LevelSummary>> dashboard(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(dashboardService.dashboard(principal.getId()));
    }

    @GetMapping("/levels/{level}")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_READ')")
    @Operation(summary = "Mastered / Learning / Locked breakdown for one level")
    public ResponseEntity<LevelDetail> level(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String level) {
        return ResponseEntity.ok(dashboardService.level(principal.getId(), level));
    }

    @PostMapping("/furigana")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_READ')")
    @Operation(summary = "Annotate Japanese sentences with furigana (ruby) segments, batched")
    public ResponseEntity<List<List<RubySegment>>> furigana(@RequestBody FuriganaRequest req) {
        List<String> texts = req.texts() == null ? List.of() : req.texts();
        return ResponseEntity.ok(texts.stream().limit(100).map(furiganaService::annotate).toList());
    }

    @GetMapping("/detail/{subUseId}")
    @PreAuthorize("hasAuthority('GRAMMAR_PROGRESS_READ')")
    @Operation(summary = "Full SRS + dictionary detail of one grammar usage")
    public ResponseEntity<GrammarDetail> detail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long subUseId) {
        return ResponseEntity.ok(dashboardService.detail(principal.getId(), subUseId));
    }
}
