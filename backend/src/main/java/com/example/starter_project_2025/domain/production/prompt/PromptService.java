package com.example.starter_project_2025.domain.production.prompt;

import com.example.starter_project_2025.domain.production.grading.ScenarioRecency;
import com.example.starter_project_2025.domain.production.grading.ScenarioRecencyRepository;
import com.example.starter_project_2025.domain.production.grammar.*;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromptService {

    private static final int RECENCY_DAYS = 7;

    private final ScenarioStubRepository scenarioRepository;
    private final ReferenceSentenceRepository referenceRepository;
    private final PromptCacheRepository promptCacheRepository;
    private final ScenarioRecencyRepository recencyRepository;

    @Transactional
    public PromptCache buildExercise(Long userId, GrammarSubUse subUse) {
        ScenarioStub scenario = pickScenario(userId, subUse);
        ReferenceSentence reference = pickReference(subUse);

        PromptCache cache = promptCacheRepository
                .findFirstBySubUseIdAndScenarioIdAndReferenceSentenceId(
                        subUse.getId(), scenario.getId(), reference.getId())
                .orElseGet(() -> generateAndCache(subUse, scenario, reference));

        recordRecency(userId, scenario);
        return cache;
    }

    private PromptCache generateAndCache(GrammarSubUse subUse, ScenarioStub scenario, ReferenceSentence reference) {
        String l1Prompt = scenario.getL1PromptTemplate();
        if (l1Prompt == null || l1Prompt.isBlank()) {
            l1Prompt = "[SITUATION] " + scenario.getSituationContext()
                    + "\n[WORDS] free\n[REGISTER] " + scenario.getRegister();
        }

        PromptCache cache = PromptCache.builder()
                .subUse(subUse)
                .scenario(scenario)
                .referenceSentence(reference)
                .l1Prompt(l1Prompt)
                .build();
        return promptCacheRepository.save(cache);
    }

    private ScenarioStub pickScenario(Long userId, GrammarSubUse subUse) {
        List<ScenarioStub> scenarios = scenarioRepository.findBySubUseId(subUse.getId());
        if (scenarios.isEmpty()) {
            throw new ResourceNotFoundException("No scenarios for grammar sub-use " + subUse.getId());
        }

        Map<Long, LocalDateTime> recent = recencyRepository
                .findByUserIdAndLastShownAtAfter(userId, LocalDateTime.now().minusDays(RECENCY_DAYS))
                .stream()
                .collect(Collectors.toMap(r -> r.getScenario().getId(), ScenarioRecency::getLastShownAt));

        Set<Long> blocked = recent.keySet();

        return scenarios.stream()
                .filter(sc -> !blocked.contains(sc.getId()))
                .findFirst()
                .orElseGet(() -> scenarios.stream()
                        .min(Comparator.comparing(sc -> recent.getOrDefault(sc.getId(), LocalDateTime.MIN)))
                        .orElse(scenarios.get(0)));
    }

    private ReferenceSentence pickReference(GrammarSubUse subUse) {
        List<ReferenceSentence> refs = referenceRepository.findBySubUseId(subUse.getId());
        if (refs.isEmpty()) {
            throw new ResourceNotFoundException("No reference sentences for grammar sub-use " + subUse.getId());
        }
        return refs.get(0);
    }

    private void recordRecency(Long userId, ScenarioStub scenario) {
        ScenarioRecency existing = recencyRepository.findByUserIdAndScenarioId(userId, scenario.getId());
        if (existing == null) {
            existing = ScenarioRecency.builder()
                    .userId(userId)
                    .scenario(scenario)
                    .lastShownAt(LocalDateTime.now())
                    .build();
        } else {
            existing.setLastShownAt(LocalDateTime.now());
        }
        recencyRepository.save(existing);
    }
}
