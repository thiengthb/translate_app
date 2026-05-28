package com.example.starter_project_2025.domain.library.srs.algorithm_config;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SrsAlgorithmConfigRepository extends BaseCrudRepository<SrsAlgorithmConfig, Long> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    Optional<SrsAlgorithmConfig> findByCode(String code);
}
