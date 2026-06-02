package com.example.starter_project_2025.domain.production.generation;

import com.example.starter_project_2025.domain.production.api.ExerciseResponse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentenceRepository;
import com.example.starter_project_2025.domain.production.grammar.ScenarioStubRepository;
import com.example.starter_project_2025.domain.production.prompt.PromptCache;
import com.example.starter_project_2025.domain.production.prompt.PromptService;
import com.example.starter_project_2025.domain.production.vocab.VocabSource;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Serves a practice exercise for a grammar point from the <b>reviewed pool</b>.
 *
 * <p>Exercises are no longer generated live by an LLM. They come from curated
 * content: AI batches are produced offline, imported via
 * {@code POST /api/production/prompts/import}, and only enter the pool once a
 * teacher approves them at {@code /production/review} (or from the hand-seeded
 * {@code ProductionSeeder} set). This keeps practice instant, offline-safe, and
 * quality-gated by a human rather than a flaky runtime LLM call.
 *
 * <p>Resolution order for a grammar point:
 * <ol>
 *   <li>Reuse a paired approved {@link PromptCache} (keeps situation ↔ answer together).</li>
 *   <li>Otherwise build one from seeded/approved scenario + reference rows.</li>
 *   <li>Otherwise {@code 503} — the bank has nothing for this grammar point yet.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExerciseGenerationService {

    /** Reuse a curated prompt as soon as a single approved one exists. */
    private static final int MIN_POOL_FOR_REUSE = 1;

    private final GrammarSubUseRepository subUseRepository;
    private final ScenarioStubRepository scenarioRepository;
    private final ReferenceSentenceRepository referenceRepository;
    private final PromptService promptService;

    /**
     * Serve one practice item for a grammar point from the reviewed pool.
     *
     * <p>{@code source} (JLPT level / deck) is retained for the drill's vocabulary
     * selector but no longer influences pool serving — pool items are keyed by the
     * grammar point, not by a sampled vocabulary set.
     */
    public ExerciseResponse generate(Long userId, Long subUseId, VocabSource source) {
        GrammarSubUse subUse = subUseRepository.findById(subUseId)
                .orElseThrow(() -> new ResourceNotFoundException("Grammar sub-use not found"));

        // 1. Reuse a paired, approved prompt (recency-aware, avoids repeats).
        PromptCache reused = promptService.reuseApproved(userId, subUseId, MIN_POOL_FOR_REUSE);
        if (reused != null) {
            return toResponse(reused, subUse);
        }

        // 2. Build one from seeded/approved scenario + reference rows (e.g. the
        //    hand-seeded points that have no PromptCache yet).
        if (hasSeededExercise(subUseId)) {
            PromptCache cache = promptService.buildExercise(userId, subUse);
            return toResponse(cache, subUse);
        }

        // 3. Nothing in the bank for this grammar point.
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Ngữ pháp này chưa có câu nào trong kho. Hãy import và duyệt thêm ở trang "
                        + "Duyệt câu, hoặc chọn ngữ pháp khác.");
    }

    /** A grammar point is serveable only when it has BOTH an approved scenario and reference. */
    private boolean hasSeededExercise(Long subUseId) {
        return !scenarioRepository.findApprovedBySubUseId(subUseId).isEmpty()
                && !referenceRepository.findApprovedBySubUseId(subUseId).isEmpty();
    }

    private ExerciseResponse toResponse(PromptCache cache, GrammarSubUse subUse) {
        return ExerciseResponse.builder()
                .promptId(cache.getId())
                .subUseId(subUse.getId())
                .subUseName(subUse.getName())
                .jlptLevel(subUse.getJlptLevel())
                .l1Prompt(cache.getL1Prompt())
                .words(List.of())
                .generated(false)
                .targetUsed(null)
                .build();
    }
}
