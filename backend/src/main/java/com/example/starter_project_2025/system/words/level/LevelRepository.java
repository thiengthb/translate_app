package com.example.starter_project_2025.system.words.level;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LevelRepository extends BaseCrudRepository<Level, Long> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    // Used by DataIO relation lookup when importing Word rows (level by code).
    Optional<Level> findByCode(String code);
}