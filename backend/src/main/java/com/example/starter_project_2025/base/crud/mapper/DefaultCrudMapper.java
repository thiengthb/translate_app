package com.example.starter_project_2025.base.crud.mapper;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Reflection-based mapper for entities whose DTO is field-for-field equivalent
 * to the entity (same names, same types). No relation lookups, no joins, no
 * custom conversions.
 *
 * <p>Registered automatically by {@code AutoCrudServiceRegistrar} for entities
 * annotated with {@code @AutoCrud} that don't ship a custom
 * {@code <Entity>Mapper}. The moment you need custom mapping (entity ↔ ID list,
 * password hashing, etc.) just create a MapStruct {@code <Entity>Mapper}
 * interface — the registrar detects the explicit bean and skips this default.
 *
 * <p>Audit / PK / version / soft-delete fields are skipped when copying DTO →
 * Entity so JPA Auditing + {@link BaseEntity}'s {@code @PrePersist} hook
 * remain authoritative.
 */
public class DefaultCrudMapper<E extends BaseEntity, D extends BaseDTO> implements BaseCrudMapper<E, D> {

    private static final Set<String> SKIP_ON_TO_ENTITY = Set.of(
            "id", "createdAt", "updatedAt", "createdBy", "updatedBy", "version", "isDeleted"
    );

    private final Class<E> entityClass;
    private final Class<D> dtoClass;

    private static final Logger log = LoggerFactory.getLogger(DefaultCrudMapper.class);

    public DefaultCrudMapper(Class<E> entityClass, Class<D> dtoClass) {
        this.entityClass = entityClass;
        this.dtoClass = dtoClass;
        warnIfRelationsPresent(entityClass);
    }

    private void warnIfRelationsPresent(Class<E> entityClass) {
        List<String> relationFields = Arrays.stream(entityClass.getDeclaredFields())
                .filter(f -> f.isAnnotationPresent(ManyToOne.class)
                        || f.isAnnotationPresent(ManyToMany.class)
                        || f.isAnnotationPresent(OneToMany.class)
                        || f.isAnnotationPresent(OneToOne.class))
                .map(Field::getName)
                .toList();

        if (!relationFields.isEmpty()) {
            log.warn(
                    "DefaultCrudMapper for {} — relation fields {} will be copied as-is by BeanUtils. "
                            + "If the DTO sends IDs (e.g. roleIds : Set<Long>) you MUST write a MapStruct "
                            + "{}Mapper to convert IDs ↔ entities; otherwise persistence will fail.",
                    entityClass.getSimpleName(), relationFields, entityClass.getSimpleName()
            );
        }
    }

    @Override
    public E toEntity(D dto) {
        try {
            E entity = entityClass.getDeclaredConstructor().newInstance();
            BeanUtils.copyProperties(dto, entity, SKIP_ON_TO_ENTITY.toArray(new String[0]));
            return entity;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("DefaultCrudMapper.toEntity failed for " + entityClass.getName(), e);
        }
    }

    @Override
    public D toResponse(E entity) {
        try {
            D dto = dtoClass.getDeclaredConstructor().newInstance();
            BeanUtils.copyProperties(entity, dto);
            return dto;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("DefaultCrudMapper.toResponse failed for " + entityClass.getName(), e);
        }
    }

    @Override
    public void update(E entity, D dto) {
        try {
            for (Field dtoField : dtoClass.getDeclaredFields()) {
                String name = dtoField.getName();
                if (SKIP_ON_TO_ENTITY.contains(name)) continue;

                dtoField.setAccessible(true);
                Object value = dtoField.get(dto);
                if (value == null) continue;

                Field entityField = findField(entityClass, name);
                if (entityField == null) continue;

                entityField.setAccessible(true);
                entityField.set(entity, value);
            }
        } catch (IllegalAccessException e) {
            throw new IllegalStateException("DefaultCrudMapper.update failed for " + entityClass.getName(), e);
        }
    }

    private Field findField(Class<?> clazz, String name) {
        Class<?> current = clazz;
        while (current != null && current != Object.class) {
            try {
                return current.getDeclaredField(name);
            } catch (NoSuchFieldException ignored) {
                current = current.getSuperclass();
            }
        }
        return null;
    }
}
