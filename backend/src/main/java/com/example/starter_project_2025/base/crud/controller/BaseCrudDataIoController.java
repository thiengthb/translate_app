package com.example.starter_project_2025.base.crud.controller;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.base.crud.dto.OnUpdate;
import com.example.starter_project_2025.base.crud.service.BaseCrudService;
import com.example.starter_project_2025.base.dataio.common.FileFormat;
import com.example.starter_project_2025.base.dataio.exporter.service.ExportService;
import com.example.starter_project_2025.base.dataio.importer.result.ImportResult;
import com.example.starter_project_2025.base.dataio.importer.service.ImportService;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ResolvableType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.SmartValidator;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Abstract base for explicit CRUD + import/export controllers.
 *
 * Concrete controllers add {@code @RestController} + {@code @RequestMapping} and
 * supply the service/repository/entity via the three abstract hooks. The DTO and
 * Filter runtime classes are resolved from the generic signature, so subclasses
 * need not pass them.
 *
 * Endpoint shapes mirror the auto-registered routes in
 * {@code AutoCrudEndpointRegistrar}; that registrar detects these mappings and
 * defers, so an entity may keep its {@code @AutoCrud} annotation without
 * producing an ambiguous mapping.
 */
public abstract class BaseCrudDataIoController<E, ID, D extends BaseDTO, F extends BaseFilter> {

    private static final Set<String> RESERVED_PARAMS = Set.of("page", "size", "sort", "search");

    @Autowired
    protected ExportService exportService;
    @Autowired
    protected ImportService importService;
    @Autowired
    protected SmartValidator validator;
    @Autowired
    protected ObjectMapper objectMapper;

    private volatile Class<D> dtoClass;
    private volatile Class<F> filterClass;

    protected abstract BaseCrudService<ID, D, F> getService();

    protected abstract BaseCrudRepository<E, ID> getRepository();

    protected abstract Class<E> getEntityClass();

    @GetMapping
    public ResponseEntity<Page<D>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            HttpServletRequest request) {
        F filter = bindFilter(request);
        return ResponseEntity.ok(getService().getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    public ResponseEntity<D> getById(@PathVariable Long id) {
        return ResponseEntity.ok(getService().getById(castId(id)));
    }

    @PostMapping
    public ResponseEntity<D> create(@RequestBody Map<String, Object> body) {
        D dto = objectMapper.convertValue(body, dtoClass());
        validate(dto, OnCreate.class);
        return ResponseEntity.ok(getService().create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<D> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        D dto = objectMapper.convertValue(body, dtoClass());
        validate(dto, OnUpdate.class);
        return ResponseEntity.ok(getService().update(castId(id), dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        getService().delete(castId(id));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk-delete")
    public ResponseEntity<Void> bulkDelete(@RequestBody List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            getService().deleteAll(ids.stream().map(this::castId).toList());
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export")
    public void exportFile(
            @RequestParam(defaultValue = "EXCEL") FileFormat format,
            HttpServletResponse response) throws IOException {
        exportService.export(format, getRepository().findAll(), getEntityClass(), response);
    }

    @PostMapping("/import")
    public ImportResult importFile(@RequestParam("file") MultipartFile file) {
        return importService.importFile(file, getEntityClass(), getRepository());
    }

    private F bindFilter(HttpServletRequest request) {
        Map<String, Object> filterMap = new HashMap<>();
        for (Map.Entry<String, String[]> entry : request.getParameterMap().entrySet()) {
            String key = entry.getKey();
            if (RESERVED_PARAMS.contains(key)) continue;

            String[] values = entry.getValue();
            if (values == null || values.length == 0) continue;

            filterMap.put(key, values.length == 1 ? values[0] : Arrays.asList(values));
        }

        if (filterMap.isEmpty()) {
            try {
                return filterClass().getDeclaredConstructor().newInstance();
            } catch (ReflectiveOperationException ignored) {
                // Fall through to Jackson as a last-ditch attempt.
            }
        }
        return objectMapper.convertValue(filterMap, filterClass());
    }

    private void validate(Object target, Class<?> group) {
        BeanPropertyBindingResult errors = new BeanPropertyBindingResult(target, "request");
        validator.validate(target, errors, group);
        if (!errors.hasErrors()) return;

        Map<String, List<String>> map = new HashMap<>();
        for (FieldError fieldError : errors.getFieldErrors()) {
            map.computeIfAbsent(fieldError.getField(), k -> new ArrayList<>())
                    .add(fieldError.getDefaultMessage());
        }
        throw new BusinessValidationException(map);
    }

    @SuppressWarnings("unchecked")
    private ID castId(Long id) {
        return (ID) id;
    }

    @SuppressWarnings("unchecked")
    private Class<D> dtoClass() {
        if (dtoClass == null) {
            dtoClass = (Class<D>) ResolvableType.forClass(getClass())
                    .as(BaseCrudDataIoController.class)
                    .resolveGeneric(2);
        }
        return dtoClass;
    }

    @SuppressWarnings("unchecked")
    private Class<F> filterClass() {
        if (filterClass == null) {
            filterClass = (Class<F>) ResolvableType.forClass(getClass())
                    .as(BaseCrudDataIoController.class)
                    .resolveGeneric(3);
        }
        return filterClass;
    }
}
