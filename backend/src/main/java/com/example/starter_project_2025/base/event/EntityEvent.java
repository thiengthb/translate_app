package com.example.starter_project_2025.base.event;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class EntityEvent<E extends BaseEntity> extends ApplicationEvent {

    private final E entity;
    private final EventType eventType;

    public EntityEvent(E entity, EventType eventType) {
        super(entity);
        this.entity = entity;
        this.eventType = eventType;
    }

    public enum EventType {
        CREATED, UPDATED, DELETED
    }

    public String getEntityName() {
        return entity.getClass().getSimpleName();
    }

    public Long getEntityId() {
        return entity.getId();
    }
}
