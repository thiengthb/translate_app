package com.example.starter_project_2025.domain.production.generation;

import com.example.starter_project_2025.domain.production.api.ExerciseResponse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentenceRepository;
import com.example.starter_project_2025.domain.production.grammar.ScenarioStubRepository;
import com.example.starter_project_2025.domain.production.llm.ComposedExercise;
import com.example.starter_project_2025.domain.production.llm.GeminiClient;
import com.example.starter_project_2025.domain.production.prompt.PromptCache;
import com.example.starter_project_2025.domain.production.prompt.PromptService;
import com.example.starter_project_2025.domain.production.vocab.VocabSelectionService;
import com.example.starter_project_2025.domain.production.vocab.VocabSource;
import com.example.starter_project_2025.domain.production.vocab.VocabWord;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Serves a practice exercise for a grammar point. The merged production page ("random
 * sinh câu" + drill) calls this for every exercise.
 *
 * <p>Resolution order:
 * <ol>
 *   <li><b>Live AI compose</b> (preferred): generate a fresh situation + model answer
 *       via {@link GeminiClient#compose}, persisted as an ephemeral {@code AUTO} prompt
 *       that only the requesting learner sees. Works for ANY selected grammar point.</li>
 *   <li>If the LLM is offline / no API key: reuse a paired approved {@link PromptCache}.</li>
 *   <li>Otherwise build one from seeded/approved scenario + reference rows.</li>
 *   <li>Otherwise {@code 503} — nothing to serve for this grammar point.</li>
 * </ol>
 *
 * <p>When {@code subUseId} is {@code null} the caller wants a random exercise: a grammar
 * point is picked at random (preferring the requested JLPT level) and then composed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExerciseGenerationService {

    /** Reuse a curated prompt as soon as a single approved one exists. */
    private static final int MIN_POOL_FOR_REUSE = 1;

    /** How many of the learner's words to feed the composer as hints. */
    private static final int VOCAB_SAMPLE = 4;

    private final GrammarSubUseRepository subUseRepository;
    private final ScenarioStubRepository scenarioRepository;
    private final ReferenceSentenceRepository referenceRepository;
    private final PromptService promptService;
    private final GeminiClient gemini;
    private final VocabSelectionService vocabService;

    /**
     * Serve one practice item for a grammar point (or a random one when {@code subUseId}
     * is {@code null}). Tries live AI generation first, then falls back to the curated pool.
     */
    public ExerciseResponse generate(Long userId, Long subUseId, VocabSource source) {
        GrammarSubUse subUse = resolveSubUse(subUseId, source);

        // 1. Live AI generation (preferred): compose a fresh exercise + model answer.
        List<VocabWord> sample = vocabService.fetch(source, VOCAB_SAMPLE);
        List<String> wordHints = sample.stream().map(VocabWord::forPrompt).toList();
        ComposedExercise composed = gemini.compose(
                subUse.getName(), subUse.getJlptLevel(), subUse.getNuanceDescription(),
                subUse.getStructurePattern(), subUse.getExampleJp(), wordHints);
        if (composed != null) {
            String l1Prompt = buildPromptBlock(composed);
            PromptCache cache = promptService.persistComposed(
                    subUse, composed.situation(), l1Prompt, composed.l2Reference(), composed.register());
            return toResponse(cache, subUse, true, composed.words());
        }

        // 2. AI unavailable → reuse a paired, approved prompt (recency-aware, avoids repeats).
        PromptCache reused = promptService.reuseApproved(userId, subUse.getId(), MIN_POOL_FOR_REUSE);
        if (reused != null) {
            return toResponse(reused, subUse, false, List.of());
        }

        // 3. Build one from seeded/approved scenario + reference rows.
        if (hasSeededExercise(subUse.getId())) {
            PromptCache cache = promptService.buildExercise(userId, subUse);
            return toResponse(cache, subUse, false, List.of());
        }

        // 4. Nothing in the bank and AI is offline.
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Ngữ pháp này chưa có câu nào trong kho và AI đang không khả dụng. "
                        + "Hãy thử lại sau hoặc chọn ngữ pháp khác.");
    }

    /** A grammar point is serveable from the pool only when it has BOTH an approved scenario and reference. */
    private boolean hasSeededExercise(Long subUseId) {
        return !scenarioRepository.findApprovedBySubUseId(subUseId).isEmpty()
                && !referenceRepository.findApprovedBySubUseId(subUseId).isEmpty();
    }

    private GrammarSubUse resolveSubUse(Long subUseId, VocabSource source) {
        if (subUseId != null) {
            return subUseRepository.findById(subUseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Grammar sub-use not found"));
        }
        return pickRandomSubUse(source);
    }

    /** Random grammar point, preferring the requested JLPT level when one is given. */
    private GrammarSubUse pickRandomSubUse(VocabSource source) {
        String level = (source != null) ? source.getLevel() : null;
        List<GrammarSubUse> all = subUseRepository.findAll();
        List<GrammarSubUse> pool = (level != null && !level.isBlank())
                ? all.stream().filter(su -> level.equalsIgnoreCase(su.getJlptLevel())).toList()
                : all;
        if (pool.isEmpty()) {
            pool = all;
        }
        if (pool.isEmpty()) {
            throw new ResourceNotFoundException("No grammar sub-uses available");
        }
        return pool.get(ThreadLocalRandom.current().nextInt(pool.size()));
    }

    /** Render the [SITUATION]/[WORDS] block the UI displays. */
    private String buildPromptBlock(ComposedExercise c) {
        String words = (c.words() == null || c.words().isEmpty()) ? "free" : String.join(", ", c.words());
        return "[SITUATION] " + c.situation()
                + "\n[WORDS] " + words;
    }

    private ExerciseResponse toResponse(PromptCache cache, GrammarSubUse subUse,
                                        boolean generated, List<String> words) {
        return ExerciseResponse.builder()
                .promptId(cache.getId())
                .subUseId(subUse.getId())
                .subUseName(subUse.getName())
                .jlptLevel(subUse.getJlptLevel())
                .l1Prompt(cache.getL1Prompt())
                .words(words == null ? List.of() : words)
                .generated(generated)
                .targetUsed(null)
                .build();
    }
}
