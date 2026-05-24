package com.example.starter_project_2025.base.event;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for domain entity events.
 * Extend this to trigger notifications, workflow, cache invalidation, etc.
 */
@Component
@Slf4j
public class EntityEventListener {

    @Async
    @EventListener
    public void handleEntityEvent(EntityEvent<? extends BaseEntity> event) {
        log.debug("Entity event: {} {} id={}",
                event.getEventType(),
                event.getEntityName(),
                event.getEntityId());
    }
}
