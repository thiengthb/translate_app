package com.example.starter_project_2025.domain.production.grading;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JudgeVerdictCacheRepository extends BaseCrudRepository<JudgeVerdictCache, Long> {

    Optional<JudgeVerdictCache> findByReferenceSentenceIdAndLearnerAnswerHash(Long referenceSentenceId, String hash);
}
