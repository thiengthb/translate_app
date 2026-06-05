package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReferenceSentenceRepository extends BaseCrudRepository<ReferenceSentence, Long> {

    List<ReferenceSentence> findBySubUseId(Long subUseId);

    /**
     * References eligible for the SHARED random pool — seeded ({@code source} null)
     * or teacher-approved. Pending ({@code GENERATED}) and rejected content is excluded.
     */
    @Query("select r from ReferenceSentence r where r.subUse.id = :subUseId "
            + "and (r.source is null or r.source = 'APPROVED')")
    List<ReferenceSentence> findApprovedBySubUseId(@Param("subUseId") Long subUseId);
}
