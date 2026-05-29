package com.example.starter_project_2025.domain.production.api;

import com.example.starter_project_2025.domain.production.grading.GradingService;
import com.example.starter_project_2025.domain.production.grading.TranslationAttempt;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.domain.production.prompt.PromptCache;
import com.example.starter_project_2025.domain.production.prompt.PromptService;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/production")
@RequiredArgsConstructor
@Tag(name = "Production", description = "Grammar production exercises (craft + grade)")
@SecurityRequirement(name = "bearerAuth")
public class ProductionController {

    private final GrammarSubUseRepository subUseRepository;
    private final PromptService promptService;
    private final GradingService gradingService;

    @GetMapping("/exercise")
    @Operation(summary = "Get a production exercise prompt")
    public ResponseEntity<ExerciseResponse> getExercise(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long subUseId) {

        GrammarSubUse subUse = (subUseId != null)
                ? subUseRepository.findById(subUseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Grammar sub-use not found"))
                : pickRandom();

        PromptCache prompt = promptService.buildExercise(principal.getId(), subUse);

        return ResponseEntity.ok(ExerciseResponse.builder()
                .promptId(prompt.getId())
                .subUseId(subUse.getId())
                .subUseName(subUse.getName())
                .jlptLevel(subUse.getJlptLevel())
                .l1Prompt(prompt.getL1Prompt())
                .build());
    }

    @PostMapping("/attempt")
    @Operation(summary = "Submit and grade a production attempt")
    public ResponseEntity<AttemptResultResponse> submitAttempt(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AttemptRequest req) {

        TranslationAttempt attempt = gradingService.grade(principal.getId(), req.getPromptId(), req.getAnswer());

        return ResponseEntity.ok(AttemptResultResponse.builder()
                .attemptId(attempt.getId())
                .finalVerdict(attempt.getFinalVerdict())
                .detectorPassed(Boolean.TRUE.equals(attempt.getDetectorPassed()))
                .judgeScore(attempt.getLlmJudgeScore())
                .feedback(attempt.getLlmJudgeFeedback())
                .build());
    }

    private GrammarSubUse pickRandom() {
        List<GrammarSubUse> all = subUseRepository.findAll();
        if (all.isEmpty()) {
            throw new ResourceNotFoundException("No grammar sub-uses seeded");
        }
        return all.get(ThreadLocalRandom.current().nextInt(all.size()));
    }
}
