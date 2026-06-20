package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
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

    /**
     * All usages of one JLPT level — powers the per-level progress screen.
     * The JLPT code lives on the related {@code Level} entity ({@code level.code}).
     */
    List<GrammarSubUse> findByLevel_CodeIgnoreCase(String code);

    /** Total-per-level counts for the dashboard, without materializing every row. */
    @Query("select l.code as level, count(s) as total from GrammarSubUse s "
            + "join s.level l where l.code is not null group by l.code")
    List<LevelCount> countByJlptLevel();

    /** Projection for {@link #countByJlptLevel()}. */
    interface LevelCount {
        String getLevel();
        long getTotal();
    }
}
