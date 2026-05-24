package com.example.starter_project_2025.base.workflow;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowEngine workflowEngine;

    @GetMapping("/history/{entityName}/{entityId}")
    public ResponseEntity<List<WorkflowTransition>> getHistory(
            @PathVariable String entityName,
            @PathVariable Long entityId) {
        return ResponseEntity.ok(workflowEngine.getHistory(entityName, entityId));
    }

    @GetMapping("/transitions/{currentState}")
    public ResponseEntity<Set<String>> getAvailableTransitions(
            @PathVariable String currentState) {
        return ResponseEntity.ok(workflowEngine.getAvailableTransitions(currentState));
    }
}
