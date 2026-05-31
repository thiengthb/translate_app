package com.example.starter_project_2025.domain.production.generation;

import com.example.starter_project_2025.domain.production.api.ExerciseResponse;
import com.example.starter_project_2025.domain.production.detector.DetectorRegistry;
import com.example.starter_project_2025.domain.production.grammar.GrammarSpotterService;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentenceRepository;
import com.example.starter_project_2025.domain.production.grammar.ScenarioStubRepository;
import com.example.starter_project_2025.domain.production.llm.OllamaClient;
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

/**
 * Builds a single-grammar practice prompt on demand, seeded with the learner's
 * vocabulary. The slow LLM call runs OUTSIDE any DB transaction; only the final
 * persistence ({@link PromptService#persistGenerated}) is transactional.
 *
 * <p>Each generated prompt is validated — the produced reference sentence must
 * actually contain the target grammar — and, when generation is unavailable,
 * the call degrades to a seeded static exercise if one exists.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExerciseGenerationService {

    private static final int VOCAB_COUNT = 6;
    private static final String DEFAULT_REGISTER = "polite";
    /** For public LEVEL sources, reuse curated prompts once this many exist. */
    private static final int MIN_POOL_FOR_REUSE = 5;

    private final GrammarSubUseRepository subUseRepository;
    private final ScenarioStubRepository scenarioRepository;
    private final ReferenceSentenceRepository referenceRepository;
    private final VocabSelectionService vocabService;
    private final OllamaClient ollamaClient;
    private final DetectorRegistry detectorRegistry;
    private final GrammarSpotterService grammarSpotter;
    private final PromptService promptService;

    public ExerciseResponse generate(Long userId, Long subUseId, VocabSource source) {
        GrammarSubUse subUse = subUseRepository.findById(subUseId)
                .orElseThrow(() -> new ResourceNotFoundException("Grammar sub-use not found"));

        // STEP 2 — reuse for PUBLIC level sources. A deck source is a per-user
        // vocab set, so its combinations are almost always novel → always generate.
        if (isLevelSource(source)) {
            PromptCache reused = promptService.reuseApproved(userId, subUseId, MIN_POOL_FOR_REUSE);
            if (reused != null) {
                return toResponse(reused, subUse, List.of(), false);
            }
        }

        // STEP 3 — generate fresh, seeded with a sample of the chosen vocabulary.
        List<VocabWord> vocab = vocabService.fetch(source, VOCAB_COUNT);

        // Generate via LLM — deliberately outside any DB transaction so the slow
        // Ollama call never pins a pooled DB connection.
        OllamaClient.GeneratedExercise gen = compose(subUse, toPromptList(vocab));

        // Quality gate: the generated reference must actually use the target grammar.
        // Retry ONCE with a fresh vocab sample (retrying the identical input tends to
        // fail the same way), then give up on generation.
        if (gen != null && !grammarPresent(subUse, gen.l2Reference())) {
            List<VocabWord> retryVocab = vocabService.fetch(source, VOCAB_COUNT);
            if (!retryVocab.isEmpty()) {
                vocab = retryVocab;
            }
            gen = compose(subUse, toPromptList(vocab));
            if (gen != null && !grammarPresent(subUse, gen.l2Reference())) {
                log.warn("Generated reference for sub-use {} never matched its grammar; falling back", subUseId);
                gen = null;
            }
        }

        // Fallback to a seeded static exercise when generation is unavailable.
        if (gen == null) {
            if (hasSeededExercise(subUseId)) {
                PromptCache fallback = promptService.buildExercise(userId, subUse);
                return toResponse(fallback, subUse, List.of(), false);
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không tạo được câu luyện tập (AI offline và chưa có mẫu sẵn cho ngữ pháp này).");
        }

        // Persist the freshly generated prompt (short transaction) and return. The
        // learner-facing prompt is just the Vietnamese situation; the seeded words
        // are surfaced separately as chips, so no machine-readable header is needed.
        PromptCache cache = promptService.persistGenerated(
                subUse, gen.situation(), gen.situation(), gen.l2Reference(), DEFAULT_REGISTER);
        return toResponse(cache, subUse, vocab, true);
    }

    private static boolean isLevelSource(VocabSource source) {
        return source != null && "LEVEL".equalsIgnoreCase(source.getType());
    }

    private static List<String> toPromptList(List<VocabWord> vocab) {
        return vocab.stream().map(VocabWord::forPrompt).toList();
    }

    private OllamaClient.GeneratedExercise compose(GrammarSubUse subUse, List<String> vocab) {
        return ollamaClient.compose(
                subUse.getJlptLevel(), subUse.getNuanceDescription(), DEFAULT_REGISTER, vocab);
    }

    private boolean grammarPresent(GrammarSubUse subUse, String l2Reference) {
        String key = subUse.getDetectorKey();
        if (key != null && detectorRegistry.hasDetector(key)) {
            return detectorRegistry.run(key, l2Reference).isPassed();
        }
        return grammarSpotter.matchesSubUse(subUse.getId(), l2Reference);
    }

    private boolean hasSeededExercise(Long subUseId) {
        // Only seeded/approved content is a valid fallback — pending AI doesn't count.
        return !scenarioRepository.findApprovedBySubUseId(subUseId).isEmpty()
                && !referenceRepository.findApprovedBySubUseId(subUseId).isEmpty();
    }

    private ExerciseResponse toResponse(PromptCache cache, GrammarSubUse subUse,
                                        List<VocabWord> vocab, boolean generated) {
        return ExerciseResponse.builder()
                .promptId(cache.getId())
                .subUseId(subUse.getId())
                .subUseName(subUse.getName())
                .jlptLevel(subUse.getJlptLevel())
                .l1Prompt(cache.getL1Prompt())
                .words(vocab.stream().map(VocabWord::forPrompt).toList())
                .generated(generated)
                .build();
    }
}
