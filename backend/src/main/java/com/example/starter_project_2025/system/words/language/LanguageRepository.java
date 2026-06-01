package com.example.starter_project_2025.system.words.language;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LanguageRepository extends BaseCrudRepository<Language, Long> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    // Used by the vocabulary import/export to resolve a Language by its code.
    Optional<Language> findByCode(String code);
}