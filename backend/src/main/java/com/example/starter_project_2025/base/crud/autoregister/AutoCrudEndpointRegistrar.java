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
 * Explicit controllers can keep custom sub-routes under the same resource.
 * Only the exact HTTP method + normalized path pair is skipped when it is
 * already mapped.
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

        Set<RouteKey> existingRoutes = collectExistingRoutes();

        Map<String, BaseCrudServiceImpl> services =
                applicationContext.getBeansOfType(BaseCrudServiceImpl.class);

        for (BaseCrudServiceImpl service : services.values()) {
            registerServiceIfEligible(service, existingRoutes);
        }
    }

    @SuppressWarnings("unchecked")
    private void registerServiceIfEligible(BaseCrudServiceImpl service, Set<RouteKey> existingRoutes) throws Exception {
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
            log.info("AutoCrud: skipping {} because autoRegister=false", entityClass.getSimpleName());
            return;
        }

        String basePath = "/api/" + stripLeadingSlash(
                autoCrud.path().isEmpty()
                        ? entityClass.getSimpleName().toLowerCase() + "s"
                        : autoCrud.path()
        );

        JpaRepository<?, ?> repository = findRepository(entityClass);

        GenericCrudHandler handler = new GenericCrudHandler(
                service, repository, exportService, importService,
                entityClass, dtoClass, filterClass,
                validator, objectMapper
        );

        boolean registeredAny = false;

        registeredAny |= registerMappingIfAbsent(handler, basePath, RequestMethod.GET, "getAll", null, existingRoutes);
        registeredAny |= registerMappingIfAbsent(handler, basePath + "/{id}", RequestMethod.GET, "getById", null, existingRoutes);
        registeredAny |= registerMappingIfAbsent(handler, basePath, RequestMethod.POST, "create", "application/json", existingRoutes);
        registeredAny |= registerMappingIfAbsent(handler, basePath + "/{id}", RequestMethod.PUT, "update", "application/json", existingRoutes);
        registeredAny |= registerMappingIfAbsent(handler, basePath + "/{id}", RequestMethod.DELETE, "delete", null, existingRoutes);

        if (autoCrud.enableBulkDelete()) {
            registeredAny |= registerMappingIfAbsent(handler, basePath + "/bulk-delete", RequestMethod.POST, "bulkDelete", "application/json", existingRoutes);
        }
        if (autoCrud.enableExport()) {
            registeredAny |= registerMappingIfAbsent(handler, basePath + "/export", RequestMethod.GET, "exportFile", null, existingRoutes);
        }
        if (autoCrud.enableImport()) {
            registeredAny |= registerMappingIfAbsent(handler, basePath + "/import", RequestMethod.POST, "importFile", "multipart/form-data", existingRoutes);
        }

        if (registeredAny) {
            log.info("AutoCrud: registered endpoints for {} at {}", entityClass.getSimpleName(), basePath);
        } else {
            log.info("AutoCrud: no endpoints registered for {} because explicit mappings already cover {}",
                    entityClass.getSimpleName(), basePath);
        }
    }

    private Set<RouteKey> collectExistingRoutes() {
        Set<RouteKey> routes = new HashSet<>();
        for (RequestMappingInfo info : handlerMapping.getHandlerMethods().keySet()) {
            Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
            if (methods.isEmpty()) {
                methods = Set.of(RequestMethod.values());
            }

            if (info.getPathPatternsCondition() != null) {
                for (String path : info.getPathPatternsCondition().getPatternValues()) {
                    addRoutes(routes, path, methods);
                }
            } else if (info.getPatternsCondition() != null) {
                for (String path : info.getPatternsCondition().getPatterns()) {
                    addRoutes(routes, path, methods);
                }
            }
        }
        return routes;
    }

    private void addRoutes(Set<RouteKey> routes, String path, Set<RequestMethod> methods) {
        String normalizedPath = normalizePath(path);
        for (RequestMethod method : methods) {
            routes.add(new RouteKey(normalizedPath, method));
        }
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

    private boolean registerMappingIfAbsent(Object handler, String path, RequestMethod method,
                                            String methodName, String consumes,
                                            Set<RouteKey> existingRoutes) throws NoSuchMethodException {
        RouteKey routeKey = new RouteKey(normalizePath(path), method);
        if (existingRoutes.contains(routeKey)) {
            log.info("AutoCrud: skipping {} {} because an explicit mapping already exists", method, path);
            return false;
        }

        registerMapping(handler, path, method, methodName, consumes);
        existingRoutes.add(routeKey);
        return true;
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

    private String normalizePath(String path) {
        return path.replaceAll("\\{[^/]+}", "{}");
    }

    private record RouteKey(String path, RequestMethod method) {
    }
}
