package com.example.starter_project_2025.system.dictionary.notebook;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotebookRepository extends JpaRepository<Notebook, Long> {

    List<Notebook> findByUserIdOrderBySortOrderAscIdAsc(Long userId);

    Optional<Notebook> findByIdAndUserId(Long id, Long userId);

    Optional<Notebook> findFirstByUserIdAndIsDefaultTrue(Long userId);

    long countByUserId(Long userId);
}