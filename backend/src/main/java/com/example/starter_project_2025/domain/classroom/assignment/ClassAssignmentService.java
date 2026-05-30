package com.example.starter_project_2025.domain.classroom.assignment;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;

import java.util.List;

public interface ClassAssignmentService extends BaseCrudService<Long, ClassAssignmentDTO, BaseFilter> {

    List<ClassAssignmentDTO> getByClassroom(Long classroomId, String status);

    ClassAssignmentDTO publish(Long assignmentId);

    ClassAssignmentDTO close(Long assignmentId);

    GradebookDTO getGradebook(Long assignmentId);
}
