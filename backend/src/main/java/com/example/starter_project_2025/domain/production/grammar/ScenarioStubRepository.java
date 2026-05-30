package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScenarioStubRepository extends BaseCrudRepository<ScenarioStub, Long> {

    List<ScenarioStub> findBySubUseId(Long subUseId);

    /** Ids of sub-uses that actually have a scenario (i.e. eligible for production exercises). */
    @Query("select distinct sc.subUse.id from ScenarioStub sc")
    List<Long> findDistinctSubUseIds();
}
