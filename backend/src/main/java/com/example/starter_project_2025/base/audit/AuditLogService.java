package com.example.starter_project_2025.base.audit;

import com.example.starter_project_2025.base.annotation.AuditEnabled;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.security.UserPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Iterator;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    private static final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public <E extends BaseEntity> void logCreate(E entity) {
        if (!isAuditEnabled(entity.getClass())) return;

        try {
            AuditLog auditLog = buildBase(entity, AuditLog.AuditAction.CREATE);
            auditLog.setAfterData(toJson(entity));
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to log audit CREATE for {} id={}", entity.getClass().getSimpleName(), entity.getId(), e);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public <E extends BaseEntity> void logUpdate(E before, E after) {
        if (!isAuditEnabled(after.getClass())) return;

        try {
            AuditLog auditLog = buildBase(after, AuditLog.AuditAction.UPDATE);
            String beforeJson = toJson(before);
            String afterJson = toJson(after);
            auditLog.setBeforeData(beforeJson);
            auditLog.setAfterData(afterJson);

            AuditEnabled annotation = after.getClass().getAnnotation(AuditEnabled.class);
            if (annotation != null && annotation.trackDiff()) {
                auditLog.setDiff(computeDiff(beforeJson, afterJson));
            }
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to log audit UPDATE for {} id={}", after.getClass().getSimpleName(), after.getId(), e);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public <E extends BaseEntity> void logDelete(E entity) {
        if (!isAuditEnabled(entity.getClass())) return;

        try {
            AuditLog auditLog = buildBase(entity, AuditLog.AuditAction.DELETE);
            auditLog.setBeforeData(toJson(entity));
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to log audit DELETE for {} id={}", entity.getClass().getSimpleName(), entity.getId(), e);
        }
    }

    public Page<AuditLog> getByEntity(String entityName, Long entityId, Pageable pageable) {
        return auditLogRepository.findByEntityNameAndEntityId(entityName, entityId, pageable);
    }

    public Page<AuditLog> getByUser(Long userId, Pageable pageable) {
        return auditLogRepository.findByUserId(userId, pageable);
    }

    public Page<AuditLog> getByEntityType(String entityName, Pageable pageable) {
        return auditLogRepository.findByEntityName(entityName, pageable);
    }

    public Page<AuditLog> getAll(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    private boolean isAuditEnabled(Class<?> entityClass) {
        return entityClass.isAnnotationPresent(AuditEnabled.class);
    }

    private <E extends BaseEntity> AuditLog buildBase(E entity, AuditLog.AuditAction action) {
        AuditLog.AuditLogBuilder builder = AuditLog.builder()
                .entityName(entity.getClass().getSimpleName())
                .entityId(entity.getId())
                .action(action);

        // Extract user info
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            builder.userId(userPrincipal.getId())
                    .userEmail(userPrincipal.getUsername());
        }

        // Extract request info
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                builder.ipAddress(getClientIp(request))
                        .userAgent(request.getHeader("User-Agent"));
            }
        } catch (Exception ignored) {
        }

        return builder.build();
    }

    private String toJson(Object obj) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (Exception e) {
            // Fallback: if serialization fails (e.g. Hibernate lazy-load proxy
            // after session closed in @Async context), return entity id only.
            try {
                if (obj instanceof BaseEntity base) {
                    return "{\"id\":" + base.getId() + "}";
                }
            } catch (Exception ignored) {}
            return "{}";
        }
    }

    private String computeDiff(String beforeJson, String afterJson) {
        try {
            JsonNode beforeNode = mapper.readTree(beforeJson);
            JsonNode afterNode = mapper.readTree(afterJson);
            ObjectNode diff = mapper.createObjectNode();

            Iterator<Map.Entry<String, JsonNode>> fields = afterNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String key = entry.getKey();
                JsonNode afterValue = entry.getValue();
                JsonNode beforeValue = beforeNode.get(key);

                if (beforeValue == null || !beforeValue.equals(afterValue)) {
                    ObjectNode change = mapper.createObjectNode();
                    change.set("old", beforeValue);
                    change.set("new", afterValue);
                    diff.set(key, change);
                }
            }

            return mapper.writeValueAsString(diff);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
