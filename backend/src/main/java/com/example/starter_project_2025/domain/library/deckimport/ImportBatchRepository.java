package com.example.starter_project_2025.domain.library.deckimport;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ImportBatchRepository extends BaseCrudRepository<ImportBatch, Long> {

    Optional<ImportBatch> findByIdAndUserId(Long id, Long userId);
}
