package com.example.starter_project_2025.base.crud.service;

import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.annotation.SoftDelete;
import com.example.starter_project_2025.base.annotation.TenantScoped;
import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.base.tenant.TenantContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.base.crud.CrudAction;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.core.GenericTypeResolver;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.ParameterizedType;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Transactional
public abstract class BaseCrudServiceImpl<
        E extends BaseEntity,
        I,
        D extends BaseDTO,
        F extends BaseFilter> implements BaseCrudService<I, D, F> {

    @Autowired
    protected AutoSpecBuilder autoSpecBuilder;

    @Autowired
    protected AuditLogService auditLogService;

    @Autowired
    protected org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Autowired
    protected ApplicationContext applicationContext;

    // Cached lookups — populated lazily once Spring has wired the context.
    private volatile BaseCrudRepository<E, I> resolvedRepository;
    private volatile BaseCrudMapper<E, D> resolvedMapper;
    private volatile String[] resolvedSearchableFields;

    /**
     * Default: lookup a {@link BaseCrudRepository} bean. Strategy:
     *   1. Convention name {@code <entity>Repository} / {@code <entity>RepositoryImpl}
     *   2. Fallback: scan all beans by generic type — works for MapStruct-
     *      generated impls and Spring Data proxies that preserve generics.
     * Subclasses can override to inject a specific bean.
     */
    @SuppressWarnings("unchecked")
    protected BaseCrudRepository<E, I> getRepository() {
        if (resolvedRepository != null) return resolvedRepository;
        Class<?> entityClass = getEntityClass();

        BaseCrudRepository<E, I> byName = lookupByConvention("Repository", BaseCrudRepository.class, entityClass);
        if (byName != null) {
            resolvedRepository = byName;
            return resolvedRepository;
        }

        Map<String, BaseCrudRepository> beans = applicationContext.getBeansOfType(BaseCrudRepository.class);
        for (BaseCrudRepository repo : beans.values()) {
            Class<?>[] generics = GenericTypeResolver.resolveTypeArguments(repo.getClass(), BaseCrudRepository.class);
            if (generics != null && generics.length >= 1 && entityClass.equals(generics[0])) {
                resolvedRepository = (BaseCrudRepository<E, I>) repo;
                return resolvedRepository;
            }
        }
        throw new IllegalStateException("No BaseCrudRepository found for entity " + entityClass.getName());
    }

    /**
     * Default: lookup a {@link BaseCrudMapper} bean. Strategy:
     *   1. Convention name {@code <entity>Mapper} / {@code <entity>MapperImpl}
     *      — works for both user MapStruct interfaces and runtime-registered
     *      {@link com.example.starter_project_2025.base.crud.mapper.DefaultCrudMapper}.
     *   2. Fallback: scan by generic type — covers MapStruct-generated impls.
     * Subclasses can override.
     */
    @SuppressWarnings("unchecked")
    protected BaseCrudMapper<E, D> getMapper() {
        if (resolvedMapper != null) return resolvedMapper;
        Class<?> entityClass = getEntityClass();

        BaseCrudMapper<E, D> byName = lookupByConvention("Mapper", BaseCrudMapper.class, entityClass);
        if (byName != null) {
            resolvedMapper = byName;
            return resolvedMapper;
        }

        Map<String, BaseCrudMapper> beans = applicationContext.getBeansOfType(BaseCrudMapper.class);
        for (BaseCrudMapper mapper : beans.values()) {
            Class<?>[] generics = GenericTypeResolver.resolveTypeArguments(mapper.getClass(), BaseCrudMapper.class);
            if (generics != null && generics.length >= 1 && entityClass.equals(generics[0])) {
                resolvedMapper = (BaseCrudMapper<E, D>) mapper;
                return resolvedMapper;
            }
        }
        throw new IllegalStateException("No BaseCrudMapper found for entity " + entityClass.getName());
    }

    @SuppressWarnings("unchecked")
    private <T> T lookupByConvention(String suffix, Class<T> requiredType, Class<?> entityClass) {
        String camel = Character.toLowerCase(entityClass.getSimpleName().charAt(0))
                + entityClass.getSimpleName().substring(1);
        for (String name : new String[]{ camel + suffix, camel + suffix + "Impl" }) {
            if (applicationContext.containsBean(name)) {
                Object bean = applicationContext.getBean(name);
                if (requiredType.isInstance(bean)) {
                    return (T) bean;
                }
            }
        }
        return null;
    }

    /**
     * Default: read {@link Searchable @Searchable(fields)} from the entity
     * class. Override to provide a hard-coded list if you don't want the
     * annotation.
     */
    protected String[] searchableFields() {
        if (resolvedSearchableFields != null) return resolvedSearchableFields;
        Searchable searchable = getEntityClass().getAnnotation(Searchable.class);
        resolvedSearchableFields = searchable != null ? searchable.fields() : new String[0];
        return resolvedSearchableFields;
    }

    protected void beforeCreate(E entity, D request, ValidationContext ctx) {}
    protected void afterCreate(E entity, D request) {}

    protected void beforeUpdate(E entity, D request, ValidationContext ctx) {}
    protected void afterUpdate(E entity, D request) {}

    protected void beforeDelete(E entity) {}
    protected void afterDelete(E entity) {}

    /** Called after each entity is mapped to a DTO. Override to enrich or derive fields. */
    protected D afterRead(D dto, E entity) { return dto; }

    protected void checkPermission(CrudAction action) {

        String permission = buildPermission(action);

        check(permission);
    }

    @Override
    public D create(D request) {

        checkPermission(CrudAction.CREATE);

        E entity = getMapper().toEntity(request);

        // Auto-set tenant
        if (isTenantScoped()) {
            Long tenantId = TenantContext.getCurrentTenant();
            if (tenantId != null) {
                entity.setTenantId(tenantId);
            }
        }

        ValidationContext ctx = new ValidationContext();

        beforeCreate(entity, request, ctx);

        ctx.throwIfErrors();

        E saved = getRepository().save(entity);

        afterCreate(saved, request);

        // Audit
        auditLogService.logCreate(saved);

        // Domain event
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return afterRead(getMapper().toResponse(saved), saved);
    }

    @Override
    public D update(I id, D request) {

        checkPermission(CrudAction.UPDATE);

        E entity = getRepository().findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entity not found"));

        // Snapshot before for audit
        E beforeSnapshot = cloneEntity(entity);

        ValidationContext ctx = new ValidationContext();

        beforeUpdate(entity, request, ctx);

        ctx.throwIfErrors();

        getMapper().update(entity, request);

        E saved = getRepository().save(entity);

        afterUpdate(saved, request);

        // Audit
        auditLogService.logUpdate(beforeSnapshot, saved);

        // Domain event
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return afterRead(getMapper().toResponse(saved), saved);
    }

    @Override
    public void delete(I id) {

        checkPermission(CrudAction.DELETE);

        E entity = getRepository().findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entity not found"));

        beforeDelete(entity);

        if (isSoftDeleteEnabled()) {
            entity.setIsDeleted(true);
            getRepository().save(entity);
        } else {
            getRepository().delete(entity);
        }

        afterDelete(entity);

        // Audit
        auditLogService.logDelete(entity);

        // Domain event
        eventPublisher.publishEvent(new EntityEvent<>(entity, EntityEvent.EventType.DELETED));
    }

    @Override
    public void deleteAll(Collection<I> ids) {
        if (ids == null) return;
        for (I id : ids) {
            delete(id);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public D getById(I id) {

        checkPermission(CrudAction.READ);

        E entity = getRepository().findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entity not found"));
        return afterRead(getMapper().toResponse(entity), entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<D> getAll(Pageable pageable, String search, F filter) {

        checkPermission(CrudAction.READ);

        Specification<E> spec = Specification.where(null);

        // Auto-filter soft-deleted records
        if (isSoftDeleteEnabled()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isDeleted"), false));
        }

        // Auto-filter by tenant
        if (isTenantScoped()) {
            Long tenantId = TenantContext.getCurrentTenant();
            if (tenantId != null) {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("tenantId"), tenantId));
            }
        }

        Specification<E> filterSpec = autoSpecBuilder.build(filter);
        Specification<E> searchSpec = buildSearchSpec(search);

        if (filterSpec != null) spec = spec.and(filterSpec);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return getRepository().findAll(spec, pageable)
                .map(entity -> afterRead(getMapper().toResponse(entity), entity));
    }

    private boolean isSoftDeleteEnabled() {
        return getEntityClass().isAnnotationPresent(SoftDelete.class);
    }

    private boolean isTenantScoped() {
        return getEntityClass().isAnnotationPresent(TenantScoped.class);
    }

    private String buildPermission(CrudAction action) {
        return getPermissionPrefix() + "_" + action.name();
    }

    private String getPermissionPrefix() {

        ResourcePermission annotation =
                getEntityClass().getAnnotation(ResourcePermission.class);

        if (annotation == null) {
            throw new IllegalStateException(
                    "Missing @ResourcePermission on entity: " + getEntityClass().getName()
            );
        }

        return annotation.value();
    }

    @SuppressWarnings("unchecked")
    public Class<E> getEntityClass() {
        return (Class<E>) resolveGenericArg(0);
    }

    @SuppressWarnings("unchecked")
    public Class<D> getDtoClass() {
        return (Class<D>) resolveGenericArg(2);
    }

    @SuppressWarnings("unchecked")
    public Class<F> getFilterClass() {
        return (Class<F>) resolveGenericArg(3);
    }

    /**
     * Walks the class hierarchy until it finds the concrete parameterization
     * of {@link BaseCrudServiceImpl} (e.g. on {@code BookServiceImpl}) and
     * returns the {@code index}-th type argument.
     *
     * Subclasses constructed without concrete type parameters (e.g.
     * {@code DefaultCrudServiceImpl} which is itself generic) MUST override
     * the three public getters above and return their stored classes instead.
     */
    private Class<?> resolveGenericArg(int index) {
        Class<?> current = getClass();
        while (current != null && current != Object.class) {
            if (current.getSuperclass() == BaseCrudServiceImpl.class
                    && current.getGenericSuperclass() instanceof ParameterizedType pt
                    && pt.getActualTypeArguments()[index] instanceof Class<?> c) {
                return c;
            }
            current = current.getSuperclass();
        }
        throw new IllegalStateException(
                "Cannot resolve generic type arg #" + index
                        + " for " + getClass().getName()
                        + ". Override the public getter explicitly."
        );
    }

    public void check(String permission) {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        if (auth == null) {
            throw new AccessDeniedException("Unauthorized");
        }

        boolean allowed = auth.getAuthorities()
                .stream()
                .anyMatch(a -> a.getAuthority().equals(permission));

        String email;

        Object principal = auth.getPrincipal();

        if (principal instanceof UserPrincipal userDetails) {
            email = userDetails.getUsername();
        } else {
            email = principal.toString();
        }

        if (!allowed) {
            throw new AccessDeniedException(
                   email + "do not have permission: " + permission
            );
        }
    }

    private Specification<E> buildSearchSpec(String keyword) {

        if (keyword == null || keyword.isBlank()) return null;

        String likePattern = "%" + keyword.toLowerCase() + "%";

        return (root, query, cb) -> {

            List<Predicate> predicates = new ArrayList<>();

            for (String field : searchableFields()) {

                try {
                    var path = root.get(field);
                    if (!String.class.equals(path.getJavaType())) {
                        continue;
                    }
                    predicates.add(cb.like(cb.lower(path.as(String.class)), likePattern));

                } catch (IllegalArgumentException ex) {
                    throw new RuntimeException("Invalid searchable field: " + field, ex);
                }
            }

            if (predicates.isEmpty()) {
                return null;
            }

            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    protected Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        return null;
    }

    /**
     * Shallow-copy the entity to a fresh instance so the AUDIT "before"
     * snapshot is not mutated by subsequent mapper.update / save.
     * BeanUtils.copyProperties skips lazy-loaded relation proxies safely
     * (former Jackson-roundtrip approach would crash on uninitialized
     * collections / cycles).
     */
    @SuppressWarnings("unchecked")
    private E cloneEntity(E entity) {
        try {
            E clone = (E) entity.getClass().getDeclaredConstructor().newInstance();
            org.springframework.beans.BeanUtils.copyProperties(entity, clone);
            return clone;
        } catch (Exception e) {
            return entity;
        }
    }
}
