package com.example.starter_project_2025.base.crud.service;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;

/**
 * Drop-in CRUD service for entities that have no business-rule hooks
 * (no {@code beforeCreate / afterCreate / beforeUpdate / afterUpdate /
 * beforeDelete / afterDelete} overrides needed).
 *
 * Registered automatically as a Spring bean by
 * {@code AutoCrudServiceRegistrar} for every entity annotated with
 * {@code @AutoCrud} that does NOT already have a custom
 * {@code BaseCrudServiceImpl} bean.
 *
 * The moment you need business logic, write your own
 * {@code BaseCrudServiceImpl} subclass — the registrar will detect the
 * explicit bean and skip the default one.
 */
public class DefaultCrudServiceImpl<
        E extends BaseEntity,
        I,
        D extends BaseDTO,
        F extends BaseFilter
> extends BaseCrudServiceImpl<E, I, D, F> {

    private final Class<E> entityClass;
    private final Class<D> dtoClass;
    private final Class<F> filterClass;
    private final BaseCrudRepository<E, I> repository;
    private final BaseCrudMapper<E, D> mapper;
    private final String[] searchableFields;

    public DefaultCrudServiceImpl(
            Class<E> entityClass,
            Class<D> dtoClass,
            Class<F> filterClass,
            BaseCrudRepository<E, I> repository,
            BaseCrudMapper<E, D> mapper,
            String[] searchableFields
    ) {
        this.entityClass = entityClass;
        this.dtoClass = dtoClass;
        this.filterClass = filterClass;
        this.repository = repository;
        this.mapper = mapper;
        this.searchableFields = searchableFields == null ? new String[0] : searchableFields;
    }

    @Override
    protected BaseCrudRepository<E, I> getRepository() {
        return repository;
    }

    @Override
    protected BaseCrudMapper<E, D> getMapper() {
        return mapper;
    }

    @Override
    protected String[] searchableFields() {
        return searchableFields;
    }

    @Override
    public Class<E> getEntityClass() {
        return entityClass;
    }

    @Override
    public Class<D> getDtoClass() {
        return dtoClass;
    }

    @Override
    public Class<F> getFilterClass() {
        return filterClass;
    }
}
