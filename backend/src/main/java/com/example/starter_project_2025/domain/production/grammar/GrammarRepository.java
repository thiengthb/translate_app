package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GrammarRepository extends BaseCrudRepository<Grammar, Long> {

    Optional<Grammar> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
