package com.example.starter_project_2025.domain.grammar.progress;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrammarProgressRepository extends BaseCrudRepository<GrammarProgress, Long> {

    Optional<GrammarProgress> findByUserIdAndSubUseId(Long userId, Long subUseId);

    List<GrammarProgress> findByUserId(Long userId);
}
