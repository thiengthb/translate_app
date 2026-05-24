package com.example.starter_project_2025.base.workflow;

import com.example.starter_project_2025.base.annotation.WorkflowEnabled;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowEngine {

    private final WorkflowTransitionRepository transitionRepository;

    // Default state machine transitions. Override per entity as needed.
    private static final Map<String, Set<String>> DEFAULT_TRANSITIONS = Map.of(
            "DRAFT", Set.of("PENDING", "CANCELLED"),
            "PENDING", Set.of("APPROVED", "REJECTED"),
            "APPROVED", Set.of("ARCHIVED"),
            "REJECTED", Set.of("DRAFT"),
            "CANCELLED", Set.of("DRAFT")
    );

    @Transactional
    public <E extends BaseEntity> E transition(E entity, String toState, String comment) {
        Class<?> entityClass = entity.getClass();
        WorkflowEnabled annotation = entityClass.getAnnotation(WorkflowEnabled.class);

        if (annotation == null) {
            throw new BadRequestException("Entity does not support workflow");
        }

        String stateField = annotation.stateField();
        String currentState = getState(entity, stateField);

        if (currentState == null) {
            currentState = annotation.initialState();
        }

        // Validate transition
        Set<String> allowedTransitions = DEFAULT_TRANSITIONS.getOrDefault(
                currentState, Collections.emptySet());

        if (!allowedTransitions.contains(toState)) {
            throw new BadRequestException(
                    "Invalid transition from " + currentState + " to " + toState +
                    ". Allowed: " + allowedTransitions);
        }

        // Validate target state is in allowed states
        String[] states = annotation.states();
        if (states.length > 0) {
            Set<String> allowedStates = new HashSet<>(Arrays.asList(states));
            if (!allowedStates.contains(toState)) {
                throw new BadRequestException("State " + toState + " is not allowed for this entity");
            }
        }

        // Set new state
        setState(entity, stateField, toState);

        // Record transition
        Long userId = getCurrentUserId();
        WorkflowTransition transition = WorkflowTransition.builder()
                .entityName(entityClass.getSimpleName())
                .entityId(entity.getId())
                .fromState(currentState)
                .toState(toState)
                .triggeredBy(userId)
                .comment(comment)
                .build();

        transitionRepository.save(transition);

        log.info("Workflow transition: {} id={} {} -> {} by user={}",
                entityClass.getSimpleName(), entity.getId(), currentState, toState, userId);

        return entity;
    }

    public List<WorkflowTransition> getHistory(String entityName, Long entityId) {
        return transitionRepository.findByEntityNameAndEntityIdOrderByTransitionedAtDesc(
                entityName, entityId);
    }

    public Set<String> getAvailableTransitions(String currentState) {
        return DEFAULT_TRANSITIONS.getOrDefault(currentState, Collections.emptySet());
    }

    private String getState(Object entity, String fieldName) {
        try {
            Field field = findField(entity.getClass(), fieldName);
            field.setAccessible(true);
            Object value = field.get(entity);
            return value != null ? value.toString() : null;
        } catch (Exception e) {
            throw new BadRequestException("Cannot read workflow state field: " + fieldName);
        }
    }

    private void setState(Object entity, String fieldName, String value) {
        try {
            Field field = findField(entity.getClass(), fieldName);
            field.setAccessible(true);
            field.set(entity, value);
        } catch (Exception e) {
            throw new BadRequestException("Cannot set workflow state field: " + fieldName);
        }
    }

    private Field findField(Class<?> clazz, String fieldName) {
        while (clazz != null) {
            try {
                return clazz.getDeclaredField(fieldName);
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        throw new BadRequestException("Field not found: " + fieldName);
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        return null;
    }
}
