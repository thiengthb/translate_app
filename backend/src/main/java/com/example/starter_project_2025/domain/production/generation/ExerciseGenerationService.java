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
        return generate(userId, subUseId, source, null);
    }

    /**
     * Generate one practice item. When {@code target} is set (coverage drill), the
     * answer is forced to use that exact word and reuse is skipped, so each call
     * deliberately practices one specific word.
     */
    public ExerciseResponse generate(Long userId, Long subUseId, VocabSource source, VocabWord target) {
        GrammarSubUse subUse = subUseRepository.findById(subUseId)
                .orElseThrow(() -> new ResourceNotFoundException("Grammar sub-use not found"));

        boolean coverage = target != null && target.surface() != null && !target.surface().isBlank();

        // STEP 2 — reuse for PUBLIC level sources. Skipped in coverage mode, which
        // must produce a fresh sentence using the specific target word.
        if (!coverage && isLevelSource(source)) {
            PromptCache reused = promptService.reuseApproved(userId, subUseId, MIN_POOL_FOR_REUSE);
            if (reused != null) {
                return toResponse(reused, subUse, List.of(), false, null);
            }
        }

        // STEP 3 — generate fresh. Coverage mode forces the single target word;
        // the plain drill seeds a random sample of the chosen vocabulary.
        List<VocabWord> vocab = coverage ? List.of(target) : vocabService.fetch(source, VOCAB_COUNT);
        String mandatory = coverage ? target.forPrompt() : null;

        // The slow LLM call runs outside any DB transaction so it never pins a connection.
        OllamaClient.GeneratedExercise gen = compose(subUse, toPromptList(vocab), mandatory);

        // Quality gate: the reference must use the target grammar (and, in coverage
        // mode, the target word). Retry ONCE, then give up on generation.
        if (gen != null && !meetsGate(subUse, gen.l2Reference(), coverage, target)) {
            if (!coverage) {
                List<VocabWord> retryVocab = vocabService.fetch(source, VOCAB_COUNT);
                if (!retryVocab.isEmpty()) {
                    vocab = retryVocab;
                }
            }
            gen = compose(subUse, toPromptList(vocab), mandatory);
            // Give up only if the grammar itself is still absent (the word is best-effort).
            if (gen != null && !grammarPresent(subUse, gen.l2Reference())) {
                log.warn("Generated reference for sub-use {} never matched its grammar; falling back", subUseId);
                gen = null;
            }
        }

        // Fallback to a seeded static exercise when generation is unavailable. A
        // seed can't contain the coverage target word, so coverage mode never falls back.
        if (gen == null) {
            if (!coverage && hasSeededExercise(subUseId)) {
                PromptCache fallback = promptService.buildExercise(userId, subUse);
                return toResponse(fallback, subUse, List.of(), false, null);
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không tạo được câu luyện tập (AI offline và chưa có mẫu sẵn cho ngữ pháp này).");
        }

        // Persist the freshly generated prompt (short transaction) and return. The
        // learner-facing prompt is just the Vietnamese situation; the words are
        // surfaced separately as chips.
        PromptCache cache = promptService.persistGenerated(
                subUse, gen.situation(), gen.situation(), gen.l2Reference(), DEFAULT_REGISTER);

        if (coverage) {
            boolean used = appearsIn(target, gen.l2Reference());
            return toResponse(cache, subUse, used ? List.of(target) : List.of(), true, used);
        }
        // Only surface the words the model actually used, not the whole sampled set.
        return toResponse(cache, subUse, usedVocab(vocab, gen.l2Reference()), true, null);
    }

    /** Generation gate: grammar must be present, plus the target word in coverage mode. */
    private boolean meetsGate(GrammarSubUse subUse, String reference, boolean coverage, VocabWord target) {
        if (!grammarPresent(subUse, reference)) {
            return false;
        }
        return !coverage || appearsIn(target, reference);
    }

    private static boolean isLevelSource(VocabSource source) {
        return source != null && "LEVEL".equalsIgnoreCase(source.getType());
    }

    private static List<String> toPromptList(List<VocabWord> vocab) {
        return vocab.stream().map(VocabWord::forPrompt).toList();
    }

    /** Best-effort: the subset of seed words whose surface/reading appears in the answer. */
    private static List<VocabWord> usedVocab(List<VocabWord> vocab, String reference) {
        if (reference == null || reference.isBlank()) {
            return List.of();
        }
        return vocab.stream().filter(w -> appearsIn(w, reference)).toList();
    }

    private static boolean appearsIn(VocabWord w, String reference) {
        String surface = w.surface();
        if (surface != null && !surface.isBlank()) {
            if (reference.contains(surface)) {
                return true;
            }
            // Crude stem so a conjugated verb/adj (寝る→寝て) still counts as "used".
            if (surface.length() >= 2 && reference.contains(surface.substring(0, surface.length() - 1))) {
                return true;
            }
        }
        String reading = w.reading();
        return reading != null && !reading.isBlank() && reference.contains(reading);
    }

    private OllamaClient.GeneratedExercise compose(GrammarSubUse subUse, List<String> vocab, String mandatoryWord) {
        return ollamaClient.compose(
                subUse.getJlptLevel(), subUse.getNuanceDescription(), DEFAULT_REGISTER, vocab, mandatoryWord);
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
                                        List<VocabWord> vocab, boolean generated, Boolean targetUsed) {
        return ExerciseResponse.builder()
                .promptId(cache.getId())
                .subUseId(subUse.getId())
                .subUseName(subUse.getName())
                .jlptLevel(subUse.getJlptLevel())
                .l1Prompt(cache.getL1Prompt())
                .words(vocab.stream().map(VocabWord::forPrompt).toList())
                .generated(generated)
                .targetUsed(targetUsed)
                .build();
    }
}
