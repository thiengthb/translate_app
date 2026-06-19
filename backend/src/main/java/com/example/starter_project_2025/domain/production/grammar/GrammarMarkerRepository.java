package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GrammarMarkerRepository extends BaseCrudRepository<GrammarMarker, Long> {

    List<GrammarMarker> findBySubUseId(Long subUseId);

    /** Markers of every OTHER sub-use (rows with a null sub-use are excluded by {@code <>}). */
    List<GrammarMarker> findBySubUseIdNot(Long subUseId);
}
