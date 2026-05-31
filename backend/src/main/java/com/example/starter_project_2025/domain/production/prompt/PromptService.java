package com.example.starter_project_2025.domain.production.prompt;

import com.example.starter_project_2025.domain.production.api.PendingPromptResponse;
import com.example.starter_project_2025.domain.production.grading.ScenarioRecency;
import com.example.starter_project_2025.domain.production.grading.ScenarioRecencyRepository;
import com.example.starter_project_2025.domain.production.grammar.*;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    /**
     * Persist a freshly AI-generated exercise (reference + scenario + prompt cache)
     * for the given grammar point and return the cached prompt. Kept short and
     * transactional; the slow LLM call happens before this in the caller.
     */
    @Transactional
    public PromptCache persistGenerated(GrammarSubUse subUse, String situation, String l1Prompt,
                                        String l2Reference, String register) {
        ReferenceSentence ref = referenceRepository.save(ReferenceSentence.builder()
                .subUse(subUse)
                .l1Text(situation)
                .l2Text(l2Reference)
                .source("GENERATED")
                .build());

        ScenarioStub scenario = scenarioRepository.save(ScenarioStub.builder()
                .subUse(subUse)
                .register(register)
                .situationContext(situation)
                .l1PromptTemplate(l1Prompt)
                .source("GENERATED")
                .build());

        return promptCacheRepository.save(PromptCache.builder()
                .subUse(subUse)
                .scenario(scenario)
                .referenceSentence(ref)
                .l1Prompt(l1Prompt)
                .build());
    }

    /**
     * Promote a generated prompt's scenario + reference from pending
     * ({@code source = "GENERATED"}) to {@code "APPROVED"} so the shared random
     * pool may serve it. No-op for already-approved/seeded content.
     */
    @Transactional
    public void approveGenerated(Long promptId) {
        PromptCache cache = promptCacheRepository.findById(promptId)
                .orElseThrow(() -> new ResourceNotFoundException("Prompt not found"));

        ScenarioStub scenario = cache.getScenario();
        if (scenario != null && "GENERATED".equals(scenario.getSource())) {
            scenario.setSource("APPROVED");
            scenarioRepository.save(scenario);
        }

        ReferenceSentence reference = cache.getReferenceSentence();
        if (reference != null && "GENERATED".equals(reference.getSource())) {
            reference.setSource("APPROVED");
            referenceRepository.save(reference);
        }
    }

    /**
     * Reuse a curated (seeded/approved) prompt for this grammar point instead of
     * generating a fresh one — used for public LEVEL sources. Returns {@code null}
     * when fewer than {@code minPool} curated prompts exist (caller should generate
     * to grow the pool). Picks randomly while avoiding scenarios shown recently.
     */
    @Transactional
    public PromptCache reuseApproved(Long userId, Long subUseId, int minPool) {
        List<PromptCache> pool = new ArrayList<>(promptCacheRepository.findApprovedBySubUseId(subUseId));
        if (pool.size() < minPool) {
            return null;
        }
        Collections.shuffle(pool);

        Map<Long, LocalDateTime> recent = recencyRepository
                .findByUserIdAndLastShownAtAfter(userId, LocalDateTime.now().minusDays(RECENCY_DAYS))
                .stream()
                .collect(Collectors.toMap(r -> r.getScenario().getId(), ScenarioRecency::getLastShownAt));
        Set<Long> blocked = recent.keySet();

        PromptCache chosen = pool.stream()
                .filter(pc -> pc.getScenario() != null && !blocked.contains(pc.getScenario().getId()))
                .findFirst()
                .orElseGet(() -> pool.stream()
                        .min(Comparator.comparing(pc -> pc.getScenario() == null
                                ? LocalDateTime.MIN
                                : recent.getOrDefault(pc.getScenario().getId(), LocalDateTime.MIN)))
                        .orElse(pool.get(0)));

        if (chosen.getScenario() != null) {
            recordRecency(userId, chosen.getScenario());
        }
        return chosen;
    }

    /**
     * Reject a generated prompt: mark its scenario + reference {@code REJECTED} so it
     * stays out of both the pool and the pending queue, without deleting history
     * (learner attempts referencing it remain valid).
     */
    @Transactional
    public void rejectGenerated(Long promptId) {
        PromptCache cache = promptCacheRepository.findById(promptId)
                .orElseThrow(() -> new ResourceNotFoundException("Prompt not found"));

        ScenarioStub scenario = cache.getScenario();
        if (scenario != null && "GENERATED".equals(scenario.getSource())) {
            scenario.setSource("REJECTED");
            scenarioRepository.save(scenario);
        }

        ReferenceSentence reference = cache.getReferenceSentence();
        if (reference != null && "GENERATED".equals(reference.getSource())) {
            reference.setSource("REJECTED");
            referenceRepository.save(reference);
        }
    }

    /** Generated prompts awaiting review (newest first), as a flat DTO for the queue. */
    @Transactional(readOnly = true)
    public List<PendingPromptResponse> listPendingReview() {
        return promptCacheRepository.findPendingReview().stream()
                .map(pc -> {
                    GrammarSubUse su = pc.getSubUse();
                    ReferenceSentence ref = pc.getReferenceSentence();
                    ScenarioStub sc = pc.getScenario();
                    return new PendingPromptResponse(
                            pc.getId(),
                            su != null ? su.getId() : null,
                            su != null ? su.getName() : null,
                            su != null ? su.getJlptLevel() : null,
                            pc.getL1Prompt(),
                            ref != null ? ref.getL2Text() : null,
                            sc != null ? sc.getRegister() : null,
                            pc.getCreatedAt());
                })
                .toList();
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
        // Pool-eligible only: seeded or approved — pending AI scenarios are excluded.
        List<ScenarioStub> scenarios = scenarioRepository.findApprovedBySubUseId(subUse.getId());
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
        // Pool-eligible only: seeded or approved — pending AI references are excluded.
        List<ReferenceSentence> refs = referenceRepository.findApprovedBySubUseId(subUse.getId());
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
