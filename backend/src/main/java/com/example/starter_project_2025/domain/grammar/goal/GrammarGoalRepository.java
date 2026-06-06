package com.example.starter_project_2025.domain.grammar.goal;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GrammarGoalRepository extends BaseCrudRepository<GrammarGoal, Long> {

    Optional<GrammarGoal> findByUserId(Long userId);
}
