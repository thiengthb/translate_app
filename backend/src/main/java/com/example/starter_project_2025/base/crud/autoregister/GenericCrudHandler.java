package com.example.starter_project_2025.base.crud.autoregister;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.SmartValidator;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Generic handler invoked by {@link AutoCrudRegistrar} for every entity
 * annotated with {@link com.example.starter_project_2025.base.annotation.AutoCrud}.
 *
 * One instance per entity. The class is annotated {@link ResponseBody} (NOT
 * {@code @RestController}) so Spring's message converters apply to non-{@code
 * ResponseEntity} return types, while component scan ignores it — the bean is
 * constructed manually by {@link AutoCrudRegistrar}.
 */
@ResponseBody
@SuppressWarnings({"rawtypes", "unchecked"})
public class GenericCrudHandler {

    private static final Set<String> RESERVED_PARAMS = Set.of("page", "size", "sort", "search");

    private final BaseCrudService service;
    private final JpaRepository repository;
    private final ExportService exportService;
    private final ImportService importService;
    private final Class<?> entityClass;
    private final Class<? extends BaseDTO> dtoClass;
    private final Class<? extends BaseFilter> filterClass;
    private final SmartValidator validator;
    private final ObjectMapper objectMapper;

    public GenericCrudHandler(
            BaseCrudService service,
            JpaRepository repository,
            ExportService exportService,
            ImportService importService,
            Class<?> entityClass,
            Class<? extends BaseDTO> dtoClass,
            Class<? extends BaseFilter> filterClass,
            SmartValidator validator,
            ObjectMapper objectMapper
    ) {
        this.service = service;
        this.repository = repository;
        this.exportService = exportService;
        this.importService = importService;
        this.entityClass = entityClass;
        this.dtoClass = dtoClass;
        this.filterClass = filterClass;
        this.validator = validator;
        this.objectMapper = objectMapper;
    }

    public ResponseEntity<Page<?>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            HttpServletRequest request
    ) {
        BaseFilter filter = bindFilter(request);
        Page<?> page = service.getAll(pageable, search, filter);
        return ResponseEntity.ok(page);
    }

    public ResponseEntity<Object> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    public ResponseEntity<Object> create(@RequestBody Map<String, Object> body) {
        BaseDTO dto = (BaseDTO) objectMapper.convertValue(body, dtoClass);
        validate(dto, OnCreate.class);
        return ResponseEntity.ok(service.create(dto));
    }

    public ResponseEntity<Object> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        BaseDTO dto = (BaseDTO) objectMapper.convertValue(body, dtoClass);
        validate(dto, OnUpdate.class);
        return ResponseEntity.ok(service.update(id, dto));
    }

    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Void> bulkDelete(@RequestBody List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            service.deleteAll(ids);
        }
        return ResponseEntity.noContent().build();
    }

    public void exportFile(
            @RequestParam(defaultValue = "EXCEL") FileFormat format,
            HttpServletResponse response
    ) throws IOException {
        exportService.export(
                format,
                repository.findAll(),
                (Class) entityClass,
                response
        );
    }

    public ImportResult importFile(@RequestParam("file") MultipartFile file) {
        return importService.importFile(file, (Class) entityClass, repository);
    }

    private BaseFilter bindFilter(HttpServletRequest request) {
        Map<String, Object> filterMap = new HashMap<>();
        for (Map.Entry<String, String[]> entry : request.getParameterMap().entrySet()) {
            String key = entry.getKey();
            if (RESERVED_PARAMS.contains(key)) continue;

            String[] values = entry.getValue();
            if (values == null || values.length == 0) continue;

            filterMap.put(key, values.length == 1 ? values[0] : Arrays.asList(values));
        }

        // Empty filter → use no-args constructor directly to avoid Jackson
        // failing on filter classes that only have @Builder (no public no-args
        // ctor).
        if (filterMap.isEmpty()) {
            try {
                return (BaseFilter) filterClass.getDeclaredConstructor().newInstance();
            } catch (ReflectiveOperationException ignored) {
                // Fall through to Jackson — last-ditch attempt.
            }
        }
        return (BaseFilter) objectMapper.convertValue(filterMap, filterClass);
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
}
