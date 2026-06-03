package com.example.starter_project_2025.domain.classroom.assignment;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassAssignmentRepository extends BaseCrudRepository<ClassAssignment, Long> {

    List<ClassAssignment> findByClassroomIdAndIsDeletedFalseOrderByCreatedAtDesc(Long classroomId);

    List<ClassAssignment> findByClassroomIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(Long classroomId, String status);
}
