package com.example.starter_project_2025.base.workflow;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowTransitionRepository extends JpaRepository<WorkflowTransition, Long> {

    List<WorkflowTransition> findByEntityNameAndEntityIdOrderByTransitionedAtDesc(
            String entityName, Long entityId);
}
