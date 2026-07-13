package com.example.starter_project_2025.domain.classroom.assignment;

import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/class-assignments")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "ClassAssignment", description = "Assignment actions: list, publish, close, gradebook")
public class ClassAssignmentController {

    ClassAssignmentService assignmentService;

    @GetMapping("/by-classroom")
    public ResponseEntity<List<ClassAssignmentDTO>> byClassroom(
            @RequestParam Long classroomId,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(assignmentService.getByClassroom(classroomId, status));
    }

    @PutMapping("/{assignmentId}/publish")
    public ResponseEntity<ClassAssignmentDTO> publish(
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(assignmentService.publish(assignmentId, principal.getId()));
    }

    @PutMapping("/{assignmentId}/close")
    public ResponseEntity<ClassAssignmentDTO> close(
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(assignmentService.close(assignmentId, principal.getId()));
    }

    @GetMapping("/{assignmentId}/gradebook")
    public ResponseEntity<GradebookDTO> gradebook(
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(assignmentService.getGradebook(assignmentId, principal.getId()));
    }
}
