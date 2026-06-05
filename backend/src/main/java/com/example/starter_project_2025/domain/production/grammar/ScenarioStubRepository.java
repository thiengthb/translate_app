package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScenarioStubRepository extends BaseCrudRepository<ScenarioStub, Long> {

    List<ScenarioStub> findBySubUseId(Long subUseId);

    /** Ids of sub-uses that actually have a scenario (i.e. eligible for production exercises). */
    @Query("select distinct sc.subUse.id from ScenarioStub sc")
    List<Long> findDistinctSubUseIds();

    /**
     * Scenarios eligible for the SHARED random pool — seeded ({@code source} null)
     * or teacher-approved. Pending ({@code GENERATED}) and rejected content is excluded.
     */
    @Query("select sc from ScenarioStub sc where sc.subUse.id = :subUseId "
            + "and (sc.source is null or sc.source = 'APPROVED')")
    List<ScenarioStub> findApprovedBySubUseId(@Param("subUseId") Long subUseId);

    /** Sub-use ids that have at least one pool-eligible (seeded/approved) scenario. */
    @Query("select distinct sc.subUse.id from ScenarioStub sc "
            + "where sc.source is null or sc.source = 'APPROVED'")
    List<Long> findDistinctApprovedSubUseIds();
}
