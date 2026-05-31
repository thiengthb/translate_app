package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GrammarSubUseRepository extends BaseCrudRepository<GrammarSubUse, Long> {

    boolean existsByDetectorKey(String detectorKey);

    List<GrammarSubUse> findByJlptLevel(String jlptLevel);

    /** Usages not yet attached to a parent expression — drives the backfill. */
    List<GrammarSubUse> findByGrammarIsNull();

    /** Usages of an expression, in display order (①②…). */
    List<GrammarSubUse> findByGrammarIdOrderByOrderNoAsc(Long grammarId);
}
