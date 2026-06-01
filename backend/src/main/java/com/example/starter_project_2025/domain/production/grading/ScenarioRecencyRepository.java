package com.example.starter_project_2025.domain.production.grading;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScenarioRecencyRepository extends BaseCrudRepository<ScenarioRecency, Long> {

    List<ScenarioRecency> findByUserIdAndLastShownAtAfter(Long userId, LocalDateTime threshold);

    ScenarioRecency findByUserIdAndScenarioId(Long userId, Long scenarioId);
}
