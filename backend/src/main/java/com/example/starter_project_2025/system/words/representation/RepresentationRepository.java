package com.example.starter_project_2025.system.words.representation;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RepresentationRepository extends BaseCrudRepository<Representation, Long> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    // Used by DataIO relation lookup when importing Word rows (representation by code).
    Optional<Representation> findByCode(String code);
}