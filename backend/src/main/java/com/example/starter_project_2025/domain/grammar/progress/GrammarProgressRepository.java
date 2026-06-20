package com.example.starter_project_2025.domain.grammar.progress;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrammarProgressRepository extends BaseCrudRepository<GrammarProgress, Long> {

    Optional<GrammarProgress> findByUserIdAndSubUseId(Long userId, Long subUseId);

    List<GrammarProgress> findByUserId(Long userId);

    /**
     * A user's progress rows with their {@link GrammarProgress#getSubUse() sub-use}
     * eagerly fetched, so the dashboard can group by JLPT level without an N+1.
     */
    @Query("select p from GrammarProgress p join fetch p.subUse s join fetch s.level "
            + "where p.user.id = :userId")
    List<GrammarProgress> findByUserIdWithSubUse(@Param("userId") Long userId);
}
