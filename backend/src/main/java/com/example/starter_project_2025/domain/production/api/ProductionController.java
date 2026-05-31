package com.example.starter_project_2025.domain.production.api;

import com.example.starter_project_2025.domain.production.generation.ExerciseGenerationService;
import com.example.starter_project_2025.domain.production.grading.GradingService;
import com.example.starter_project_2025.domain.production.grading.TranslationAttempt;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.domain.production.grammar.ScenarioStubRepository;
import com.example.starter_project_2025.domain.production.prompt.PromptCache;
import com.example.starter_project_2025.domain.production.prompt.PromptService;
import com.example.starter_project_2025.domain.production.vocab.VocabSelectionService;
import com.example.starter_project_2025.domain.production.vocab.VocabSource;
import com.example.starter_project_2025.domain.production.vocab.VocabWord;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
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

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/production")
@RequiredArgsConstructor
@Tag(name = "Production", description = "Grammar production exercises (craft + grade)")
@SecurityRequirement(name = "bearerAuth")
public class ProductionController {

    private final GrammarSubUseRepository subUseRepository;
    private final ScenarioStubRepository scenarioRepository;
    private final PromptService promptService;
    private final GradingService gradingService;
    private final ExerciseGenerationService generationService;
    private final VocabSelectionService vocabService;

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

    @GetMapping("/grammars")
    @Operation(summary = "List grammar points available to drill (id, name, level)")
    public ResponseEntity<List<GrammarOption>> listGrammars() {
        List<GrammarOption> options = subUseRepository.findAll().stream()
                .map(su -> new GrammarOption(su.getId(), su.getName(), su.getJlptLevel()))
                .sorted(Comparator
                        .comparing(GrammarOption::jlptLevel, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(GrammarOption::name, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        return ResponseEntity.ok(options);
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate a vocab-driven practice prompt for a selected grammar point")
    public ResponseEntity<ExerciseResponse> generate(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody GenerateExerciseRequest req) {

        return ResponseEntity.ok(generationService.generate(
                principal.getId(), req.getSubUseId(), req.getSource()));
    }

    @GetMapping("/vocab")
    @Operation(summary = "List all vocabulary words for a source (drives the coverage-drill setup)")
    public ResponseEntity<List<VocabWord>> listVocab(
            @RequestParam String type,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) Long deckId) {

        VocabSource source = new VocabSource();
        source.setType(type);
        source.setLevel(level);
        source.setDeckId(deckId);
        return ResponseEntity.ok(vocabService.fetchAll(source));
    }

    @GetMapping("/prompts/pending")
    @PreAuthorize("hasAuthority('SCENARIO_STUB_UPDATE')")
    @Operation(summary = "List AI-generated prompts awaiting teacher review")
    public ResponseEntity<List<PendingPromptResponse>> listPending() {
        return ResponseEntity.ok(promptService.listPendingReview());
    }

    @PostMapping("/prompts/{promptId}/approve")
    @PreAuthorize("hasAuthority('SCENARIO_STUB_UPDATE')")
    @Operation(summary = "Approve a generated prompt so it can enter the shared practice pool")
    public ResponseEntity<Void> approvePrompt(@PathVariable Long promptId) {
        promptService.approveGenerated(promptId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/prompts/{promptId}/reject")
    @PreAuthorize("hasAuthority('SCENARIO_STUB_UPDATE')")
    @Operation(summary = "Reject a generated prompt (keeps it out of the shared pool)")
    public ResponseEntity<Void> rejectPrompt(@PathVariable Long promptId) {
        promptService.rejectGenerated(promptId);
        return ResponseEntity.noContent().build();
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
                .referenceAnswer(attempt.getPrompt().getReferenceSentence().getL2Text())
                .build());
    }

    private GrammarSubUse pickRandom() {
        // Only sub-uses that have a scenario can drive an exercise; the Grammar
        // Spotter dictionary adds many scenario-less sub-uses, so filter them out.
        Set<Long> withScenario = new HashSet<>(scenarioRepository.findDistinctApprovedSubUseIds());
        List<GrammarSubUse> eligible = subUseRepository.findAll().stream()
                .filter(su -> withScenario.contains(su.getId()))
                .toList();
        if (eligible.isEmpty()) {
            throw new ResourceNotFoundException("No grammar sub-uses with a scenario seeded");
        }
        return eligible.get(ThreadLocalRandom.current().nextInt(eligible.size()));
    }

    /** Lightweight grammar-point option for the drill selector. */
    public record GrammarOption(Long id, String name, String jlptLevel) {}
}
