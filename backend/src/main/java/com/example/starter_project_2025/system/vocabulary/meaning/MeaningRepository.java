package com.example.starter_project_2025.system.vocabulary.meaning;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MeaningRepository extends BaseCrudRepository<Meaning, Long> {

    boolean existsByLanguageId(Long languageId);
}
