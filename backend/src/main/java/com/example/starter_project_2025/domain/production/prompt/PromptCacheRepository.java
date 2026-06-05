package com.example.starter_project_2025.domain.production.prompt;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PromptCacheRepository extends BaseCrudRepository<PromptCache, Long> {

    Optional<PromptCache> findFirstBySubUseIdAndScenarioIdAndReferenceSentenceId(
            Long subUseId, Long scenarioId, Long referenceSentenceId);

    /**
     * Curated prompts for a grammar point eligible for REUSE — both their scenario
     * and reference must be seeded ({@code source} null) or teacher-approved, so
     * reusing one never serves another learner unreviewed/rejected AI output.
     */
    @Query("select pc from PromptCache pc "
            + "where pc.subUse.id = :subUseId "
            + "and (pc.scenario.source is null or pc.scenario.source = 'APPROVED') "
            + "and (pc.referenceSentence.source is null or pc.referenceSentence.source = 'APPROVED')")
    List<PromptCache> findApprovedBySubUseId(@Param("subUseId") Long subUseId);

    /**
     * Generated prompts still awaiting teacher review (newest first) — drives the
     * approval queue. Identified by a pending ({@code GENERATED}) scenario.
     */
    @Query("select pc from PromptCache pc where pc.scenario.source = 'GENERATED' order by pc.id desc")
    List<PromptCache> findPendingReview();
}
