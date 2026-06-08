package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrammarSubUseRepository extends BaseCrudRepository<GrammarSubUse, Long> {

    boolean existsByDetectorKey(String detectorKey);

    /** Resolve a grammar point by its stable seed key — used by the bulk prompt import. */
    Optional<GrammarSubUse> findByDetectorKey(String detectorKey);

    /** Usages not yet attached to a parent expression — drives the backfill. */
    List<GrammarSubUse> findByGrammarIsNull();

    /** Usages of an expression, in display order (①②…). */
    List<GrammarSubUse> findByGrammarIdOrderByOrderNoAsc(Long grammarId);
}
