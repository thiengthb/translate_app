package com.example.starter_project_2025.base.crud.autoregister;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import net.bytebuddy.ByteBuddy;
import net.bytebuddy.description.type.TypeDescription;
import net.bytebuddy.dynamic.DynamicType;
import net.bytebuddy.dynamic.loading.ClassLoadingStrategy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.invoke.MethodHandles;
import java.util.Collections;
import java.util.Map;
import java.util.WeakHashMap;

/**
 * Generates a runtime interface
 * {@code <entityPackage>.<EntityName>AutoRepository extends BaseCrudRepository<Entity, Long>}
 * for entities that have no user-written Repository file.
 *
 * Spring Data JPA needs a concrete interface (not the raw
 * {@link BaseCrudRepository}) to read its entity type and ID type from the
 * generic signature — this generator creates exactly that one extra interface
 * on the fly with ByteBuddy, then hands it to {@code JpaRepositoryFactoryBean}.
 *
 * Generated interfaces are cached per entity class to keep startup idempotent
 * across DevTools restarts.
 */
public final class RuntimeRepositoryGenerator {

    private static final Logger log = LoggerFactory.getLogger(RuntimeRepositoryGenerator.class);
    // WeakHashMap so DevTools-driven classloader restarts release prior
    // entity classes for GC and don't strand stale generated interfaces.
    private static final Map<Class<?>, Class<?>> CACHE =
            Collections.synchronizedMap(new WeakHashMap<>());

    private RuntimeRepositoryGenerator() {
    }

    public static Class<?> generate(Class<?> entityClass, Class<?> idClass) {
        // Manual lock — Map.computeIfAbsent isn't atomic on a synchronized
        // WeakHashMap wrapper, so we coordinate explicitly.
        synchronized (CACHE) {
            Class<?> cached = CACHE.get(entityClass);
            if (cached != null) return cached;

            Class<?> built = build(entityClass, idClass);
            CACHE.put(entityClass, built);
            return built;
        }
    }

    private static Class<?> build(Class<?> entityClass, Class<?> idClass) {
        String fqcn = entityClass.getPackageName()
                + "." + entityClass.getSimpleName() + "AutoRepository";

        DynamicType.Unloaded<?> unloaded = new ByteBuddy()
                .makeInterface(
                        TypeDescription.Generic.Builder
                                .parameterizedType(BaseCrudRepository.class, entityClass, idClass)
                                .build()
                )
                .name(fqcn)
                .make();

        try {
            MethodHandles.Lookup lookup = MethodHandles.privateLookupIn(
                    entityClass, MethodHandles.lookup()
            );

            Class<?> loaded = unloaded
                    .load(entityClass.getClassLoader(), ClassLoadingStrategy.UsingLookup.of(lookup))
                    .getLoaded();

            log.info("AutoCrud: generated runtime repository interface {}", fqcn);
            return loaded;
        } catch (IllegalAccessException ex) {
            throw new IllegalStateException(
                    "Cannot define runtime repository for " + entityClass.getName()
                            + " — module access denied.", ex);
        }
    }
}
