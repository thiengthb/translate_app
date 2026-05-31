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
import java.util.stream.Collectors;

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

        List<VocabWord> vocab = vocabService.fetch(source, VOCAB_COUNT);
        List<String> vocabForPrompt = vocab.stream().map(VocabWord::forPrompt).toList();

        // 1. Generate via LLM — deliberately outside any DB transaction so the
        //    slow Ollama call never pins a pooled DB connection.
        OllamaClient.GeneratedExercise gen = compose(subUse, vocabForPrompt);

        // 2. Quality gate: the generated reference must actually use the target
        //    grammar. Retry once, then give up on generation.
        if (gen != null && !grammarPresent(subUse, gen.l2Reference())) {
            gen = compose(subUse, vocabForPrompt);
            if (gen != null && !grammarPresent(subUse, gen.l2Reference())) {
                log.warn("Generated reference for sub-use {} never matched its grammar; falling back", subUseId);
                gen = null;
            }
        }

        // 3. Fallback to a seeded static exercise when generation is unavailable.
        if (gen == null) {
            if (hasSeededExercise(subUseId)) {
                PromptCache fallback = promptService.buildExercise(userId, subUse);
                return toResponse(fallback, subUse, vocab, false);
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không tạo được câu luyện tập (AI offline và chưa có mẫu sẵn cho ngữ pháp này).");
        }

        // 4. Persist the freshly generated prompt (short transaction) and return.
        String wordsLine = vocab.isEmpty() ? "free"
                : vocab.stream().map(VocabWord::forPrompt).collect(Collectors.joining(", "));
        String l1Prompt = "[SITUATION] " + gen.situation()
                + "\n[WORDS] " + wordsLine
                + "\n[REGISTER] " + DEFAULT_REGISTER;

        PromptCache cache = promptService.persistGenerated(
                subUse, gen.situation(), l1Prompt, gen.l2Reference(), DEFAULT_REGISTER);
        return toResponse(cache, subUse, vocab, true);
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
        return !scenarioRepository.findBySubUseId(subUseId).isEmpty()
                && !referenceRepository.findBySubUseId(subUseId).isEmpty();
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
