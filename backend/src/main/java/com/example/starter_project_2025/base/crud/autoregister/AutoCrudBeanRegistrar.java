package com.example.starter_project_2025.base.crud.autoregister;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.mapper.DefaultCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.service.DefaultCrudServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.support.BeanDefinitionBuilder;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactoryBean;

import java.util.Arrays;
import java.util.Set;

/**
 * Scans every {@link AutoCrud}-annotated entity at startup and registers
 * default beans for each missing component independently:
 * Repository, Mapper, Service.
 *
 * Each entity can mix-and-match — e.g. an entity may ship an explicit
 * {@code BookServiceImpl} (custom validation hooks) while letting the
 * framework auto-generate the Mapper and Repository.
 *
 * Lookup conventions (entity {@code SimpleName} → {@code lowerCamel}):
 * <ul>
 *   <li>DTO:    {@code <Entity>DTO} in the same package as the entity.</li>
 *   <li>Filter: {@code <Entity>Filter} in the same package, else {@link BaseFilter}.</li>
 *   <li>Repository bean: {@code <entity>Repository} (or runtime-generated).</li>
 *   <li>Mapper bean: {@code <entity>Mapper} / {@code <entity>MapperImpl}
 *       (MapStruct) — or runtime-registered {@link DefaultCrudMapper}.</li>
 *   <li>Service bean: {@code <entity>Service} / {@code <entity>ServiceImpl}
 *       — or runtime-registered {@link DefaultCrudServiceImpl}.</li>
 *   <li>Searchable fields: {@link Searchable @Searchable(fields)} on entity.</li>
 * </ul>
 */
public class AutoCrudBeanRegistrar implements BeanDefinitionRegistryPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(AutoCrudBeanRegistrar.class);
    private static final String BASE_PACKAGE = "com.example";

    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(AutoCrud.class));

        Set<BeanDefinition> candidates = scanner.findCandidateComponents(BASE_PACKAGE);

        for (BeanDefinition candidate : candidates) {
            try {
                Class<?> entityClass = Class.forName(candidate.getBeanClassName());
                AutoCrud autoCrud = entityClass.getAnnotation(AutoCrud.class);
                if (autoCrud == null || !autoCrud.autoRegister()) continue;
                registerBeansForEntity(registry, entityClass);
            } catch (ClassNotFoundException e) {
                log.warn("AutoCrudBeanRegistrar: cannot load {}", candidate.getBeanClassName(), e);
            }
        }
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
        // No-op
    }

    private void registerBeansForEntity(BeanDefinitionRegistry registry, Class<?> entityClass) {
        String entityName = entityClass.getSimpleName();
        String camel = decapitalize(entityName);

        Class<?> dtoClass = loadCompanion(entityClass, "DTO");
        if (dtoClass == null) {
            log.warn("AutoCrud: no DTO found for {} (expected {}DTO in same package) — skipping",
                    entityName, entityName);
            return;
        }

        // --- Repository (Mức 1.c) ---
        String repoBeanName = camel + "Repository";
        String resolvedRepoBean = resolveBeanName(registry, repoBeanName, camel + "RepositoryImpl");
        if (resolvedRepoBean == null) {
            Class<?> dynRepoInterface = RuntimeRepositoryGenerator.generate(entityClass, Long.class);
            registry.registerBeanDefinition(repoBeanName, BeanDefinitionBuilder
                    .genericBeanDefinition(JpaRepositoryFactoryBean.class)
                    .addConstructorArgValue(dynRepoInterface)
                    .getBeanDefinition());
            resolvedRepoBean = repoBeanName;
            log.info("AutoCrud: auto-generated repository bean '{}' for {}", repoBeanName, entityName);
        }

        // --- Mapper (Mức 2) ---
        String mapperBeanName = camel + "Mapper";
        String resolvedMapperBean = resolveBeanName(registry, mapperBeanName, camel + "MapperImpl");
        if (resolvedMapperBean == null) {
            registry.registerBeanDefinition(mapperBeanName, BeanDefinitionBuilder
                    .genericBeanDefinition(DefaultCrudMapper.class)
                    .addConstructorArgValue(entityClass)
                    .addConstructorArgValue(dtoClass)
                    .getBeanDefinition());
            resolvedMapperBean = mapperBeanName;
            log.info("AutoCrud: auto-generated mapper bean '{}' for {} (DefaultCrudMapper)",
                    mapperBeanName, entityName);
        }

        // --- Service (Mức 1.b) ---
        String serviceBeanName = camel + "Service";
        String implBeanName = camel + "ServiceImpl";
        if (registry.containsBeanDefinition(serviceBeanName)
                || registry.containsBeanDefinition(implBeanName)) {
            log.info("AutoCrud: keeping explicit service for {} (auto Repo/Mapper still apply if missing)",
                    entityName);
            return;
        }

        Class<?> filterClass = loadCompanion(entityClass, "Filter");
        if (filterClass == null) filterClass = BaseFilter.class;

        Searchable searchable = entityClass.getAnnotation(Searchable.class);
        String[] searchableFields = searchable != null ? searchable.fields() : new String[0];

        registry.registerBeanDefinition(serviceBeanName, BeanDefinitionBuilder
                .genericBeanDefinition(DefaultCrudServiceImpl.class)
                .addConstructorArgValue(entityClass)
                .addConstructorArgValue(dtoClass)
                .addConstructorArgValue(filterClass)
                .addConstructorArgReference(resolvedRepoBean)
                .addConstructorArgReference(resolvedMapperBean)
                .addConstructorArgValue(searchableFields)
                .getBeanDefinition());

        log.info("AutoCrud: registered '{}' (DefaultCrudServiceImpl) for {} | dto={} filter={} repo={} mapper={} searchable={}",
                serviceBeanName, entityName,
                dtoClass.getSimpleName(),
                filterClass.getSimpleName(),
                resolvedRepoBean,
                resolvedMapperBean,
                Arrays.toString(searchableFields));
    }

    private String resolveBeanName(BeanDefinitionRegistry registry, String... candidates) {
        for (String name : candidates) {
            if (registry.containsBeanDefinition(name)) {
                return name;
            }
        }
        return null;
    }

    private Class<?> loadCompanion(Class<?> entityClass, String suffix) {
        String fqcn = entityClass.getPackageName() + "." + entityClass.getSimpleName() + suffix;
        try {
            return Class.forName(fqcn);
        } catch (ClassNotFoundException e) {
            return null;
        }
    }

    private String decapitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }
}
