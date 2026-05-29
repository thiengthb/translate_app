package com.example.starter_project_2025.domain.production.prompt;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PromptCacheRepository extends BaseCrudRepository<PromptCache, Long> {

    Optional<PromptCache> findFirstBySubUseIdAndScenarioIdAndReferenceSentenceId(
            Long subUseId, Long scenarioId, Long referenceSentenceId);
}
