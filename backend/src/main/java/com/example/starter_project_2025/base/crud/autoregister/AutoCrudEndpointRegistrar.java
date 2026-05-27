package com.example.starter_project_2025.base.crud.autoregister;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.dataio.exporter.service.ExportService;
import com.example.starter_project_2025.base.dataio.importer.service.ImportService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationContext;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.GenericTypeResolver;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.util.ClassUtils;
import org.springframework.validation.SmartValidator;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * On application startup, scans every {@link BaseCrudServiceImpl} bean and
 * registers REST endpoints programmatically for entities annotated with
 * {@link AutoCrud}.
 *
 * Registration is skipped when an explicit {@code @RestController} already
 * exposes the target path — so existing controllers (User, Role, …) continue
 * to work and an entity becomes auto-registered the moment its custom
 * controller is removed.
 */
@Slf4j
@Component
public class AutoCrudEndpointRegistrar {

    private final ApplicationContext applicationContext;
    private final RequestMappingHandlerMapping handlerMapping;
    private final ExportService exportService;
    private final ImportService importService;
    private final SmartValidator validator;
    private final ObjectMapper objectMapper;

    private boolean registered = false;

    public AutoCrudEndpointRegistrar(
            ApplicationContext applicationContext,
            @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping,
            ExportService exportService,
            ImportService importService,
            SmartValidator validator,
            ObjectMapper objectMapper
    ) {
        this.applicationContext = applicationContext;
        this.handlerMapping = handlerMapping;
        this.exportService = exportService;
        this.importService = importService;
        this.validator = validator;
        this.objectMapper = objectMapper;
    }

    @EventListener(ContextRefreshedEvent.class)
    public void registerAutoCrudEndpoints() throws Exception {
        if (registered) return;
        registered = true;

        Set<String> existingPaths = collectExistingPaths();

        Map<String, BaseCrudServiceImpl> services =
                applicationContext.getBeansOfType(BaseCrudServiceImpl.class);

        for (BaseCrudServiceImpl service : services.values()) {
            registerServiceIfEligible(service, existingPaths);
        }
    }

    @SuppressWarnings("unchecked")
    private void registerServiceIfEligible(BaseCrudServiceImpl service, Set<String> existingPaths) throws Exception {
        Class<?> entityClass;
        Class<? extends BaseDTO> dtoClass;
        Class<? extends BaseFilter> filterClass;

        try {
            entityClass = service.getEntityClass();
            dtoClass = (Class<? extends BaseDTO>) service.getDtoClass();
            filterClass = (Class<? extends BaseFilter>) service.getFilterClass();
        } catch (RuntimeException ex) {
            log.warn("AutoCrud: cannot resolve generics on {}: {}",
                    ClassUtils.getUserClass(service).getName(), ex.getMessage());
            return;
        }

        AutoCrud autoCrud = AnnotationUtils.findAnnotation(entityClass, AutoCrud.class);
        if (autoCrud == null) return;
        if (!autoCrud.autoRegister()) {
            log.info("AutoCrud: skipping {} — autoRegister=false", entityClass.getSimpleName());
            return;
        }

        String basePath = "/api/" + stripLeadingSlash(
                autoCrud.path().isEmpty()
                        ? entityClass.getSimpleName().toLowerCase() + "s"
                        : autoCrud.path()
        );

        if (pathAlreadyMapped(basePath, existingPaths)) {
            log.info("AutoCrud: skipping {} — explicit controller already serves {}",
                    entityClass.getSimpleName(), basePath);
            return;
        }

        JpaRepository<?, ?> repository = findRepository(entityClass);

        GenericCrudHandler handler = new GenericCrudHandler(
                service, repository, exportService, importService,
                entityClass, dtoClass, filterClass,
                validator, objectMapper
        );

        registerMapping(handler, basePath, RequestMethod.GET, "getAll", null);
        registerMapping(handler, basePath + "/{id}", RequestMethod.GET, "getById", null);
        registerMapping(handler, basePath, RequestMethod.POST, "create", "application/json");
        registerMapping(handler, basePath + "/{id}", RequestMethod.PUT, "update", "application/json");
        registerMapping(handler, basePath + "/{id}", RequestMethod.DELETE, "delete", null);

        if (autoCrud.enableBulkDelete()) {
            registerMapping(handler, basePath + "/bulk-delete", RequestMethod.POST, "bulkDelete", "application/json");
        }
        if (autoCrud.enableExport()) {
            registerMapping(handler, basePath + "/export", RequestMethod.GET, "exportFile", null);
        }
        if (autoCrud.enableImport()) {
            registerMapping(handler, basePath + "/import", RequestMethod.POST, "importFile", "multipart/form-data");
        }

        log.info("AutoCrud: registered endpoints for {} at {}", entityClass.getSimpleName(), basePath);
    }

    private Set<String> collectExistingPaths() {
        Set<String> paths = new HashSet<>();
        for (RequestMappingInfo info : handlerMapping.getHandlerMethods().keySet()) {
            if (info.getPathPatternsCondition() != null) {
                info.getPathPatternsCondition().getPatternValues().forEach(paths::add);
            } else if (info.getPatternsCondition() != null) {
                paths.addAll(info.getPatternsCondition().getPatterns());
            }
        }
        return paths;
    }

    private boolean pathAlreadyMapped(String basePath, Set<String> existingPaths) {
        for (String existing : existingPaths) {
            if (existing.equals(basePath) || existing.startsWith(basePath + "/")) {
                return true;
            }
        }
        return false;
    }

    private JpaRepository<?, ?> findRepository(Class<?> entityClass) {
        String[] beanNames = applicationContext.getBeanNamesForType(JpaRepository.class);
        for (String name : beanNames) {
            Class<?> beanType = applicationContext.getType(name);
            if (beanType == null) continue;

            Class<?>[] generics = GenericTypeResolver.resolveTypeArguments(beanType, JpaRepository.class);
            if (generics != null && generics.length >= 1 && entityClass.equals(generics[0])) {
                return (JpaRepository<?, ?>) applicationContext.getBean(name);
            }
        }
        throw new IllegalStateException("AutoCrud: no JpaRepository found for entity " + entityClass.getName());
    }

    private void registerMapping(Object handler, String path, RequestMethod method,
                                 String methodName, String consumes) throws NoSuchMethodException {

        Method targetMethod = findMethod(handler.getClass(), methodName);

        RequestMappingInfo.Builder builder = RequestMappingInfo
                .paths(path)
                .methods(method);

        if (consumes != null) {
            builder.consumes(consumes);
        }

        handlerMapping.registerMapping(builder.build(), handler, targetMethod);
    }

    private Method findMethod(Class<?> clazz, String name) throws NoSuchMethodException {
        for (Method m : clazz.getDeclaredMethods()) {
            if (m.getName().equals(name)) {
                return m;
            }
        }
        throw new NoSuchMethodException(clazz.getName() + "." + name);
    }

    private String stripLeadingSlash(String s) {
        return s.startsWith("/") ? s.substring(1) : s;
    }
}
