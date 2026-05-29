package com.example.starter_project_2025.base.audit;

import com.example.starter_project_2025.security.PermissionChecker;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private static final String AUDIT_READ = "AUDIT_READ";

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<Page<AuditLog>> getAll(@PageableDefault Pageable pageable) {
        PermissionChecker.require(AUDIT_READ);
        return ResponseEntity.ok(auditLogService.getAll(pageable));
    }

    @GetMapping("/entity/{entityName}/{entityId}")
    public ResponseEntity<Page<AuditLog>> getByEntity(
            @PathVariable String entityName,
            @PathVariable Long entityId,
            @PageableDefault Pageable pageable) {
        PermissionChecker.require(AUDIT_READ);
        return ResponseEntity.ok(auditLogService.getByEntity(entityName, entityId, pageable));
    }

    @GetMapping("/entity/{entityName}")
    public ResponseEntity<Page<AuditLog>> getByEntityType(
            @PathVariable String entityName,
            @PageableDefault Pageable pageable) {
        PermissionChecker.require(AUDIT_READ);
        return ResponseEntity.ok(auditLogService.getByEntityType(entityName, pageable));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<AuditLog>> getByUser(
            @PathVariable Long userId,
            @PageableDefault Pageable pageable) {
        PermissionChecker.require(AUDIT_READ);
        return ResponseEntity.ok(auditLogService.getByUser(userId, pageable));
    }
}
