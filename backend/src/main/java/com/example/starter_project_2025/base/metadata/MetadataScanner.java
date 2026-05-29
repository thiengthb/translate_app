package com.example.starter_project_2025.base.metadata;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.metadata.dto.EntityMetadataDTO;
import com.example.starter_project_2025.base.metadata.dto.FieldMetadataDTO;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import org.reflections.Reflections;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class MetadataScanner {

    private final Map<String, EntityMetadataDTO> metadataCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void scan() {
        Reflections reflections = new Reflections("com.example.starter_project_2025");
        Set<Class<?>> entities = reflections.getTypesAnnotatedWith(Entity.class);

        for (Class<?> entityClass : entities) {
            EntityMetadataDTO metadata = buildMetadata(entityClass);
            if (metadata != null) {
                metadataCache.put(metadata.getEntityName(), metadata);
            }
        }
    }

    public Map<String, EntityMetadataDTO> getAllMetadata() {
        return Collections.unmodifiableMap(metadataCache);
    }

    public Optional<EntityMetadataDTO> getMetadata(String entityName) {
        if (entityName == null) return Optional.empty();
        // Direct hit first (preserves expected camel case), else case-insensitive scan.
        EntityMetadataDTO direct = metadataCache.get(entityName);
        if (direct != null) return Optional.of(direct);
        return metadataCache.entrySet().stream()
                .filter(e -> e.getKey().equalsIgnoreCase(entityName))
                .map(Map.Entry::getValue)
                .findFirst();
    }

    private EntityMetadataDTO buildMetadata(Class<?> entityClass) {
        String entityName = entityClass.getSimpleName();

        EntityLabel entityLabel = entityClass.getAnnotation(EntityLabel.class);
        ResourcePermission resourcePermission = entityClass.getAnnotation(ResourcePermission.class);
        ResourceMenu resourceMenu = entityClass.getAnnotation(ResourceMenu.class);
        AutoCrud autoCrud = entityClass.getAnnotation(AutoCrud.class);
        Searchable searchable = entityClass.getAnnotation(Searchable.class);
        Filterable filterable = entityClass.getAnnotation(Filterable.class);
        Sortable sortable = entityClass.getAnnotation(Sortable.class);

        // Build field metadata
        List<FieldMetadataDTO> fields = buildFieldMetadata(entityClass, searchable, filterable, sortable);

        // Build features map
        Map<String, Object> features = new LinkedHashMap<>();
        features.put("softDelete", entityClass.isAnnotationPresent(SoftDelete.class));
        features.put("auditEnabled", entityClass.isAnnotationPresent(AuditEnabled.class));
        features.put("tenantScoped", entityClass.isAnnotationPresent(TenantScoped.class));

        CacheableEntity cacheableEntity = entityClass.getAnnotation(CacheableEntity.class);
        features.put("cacheable", cacheableEntity != null);
        if (cacheableEntity != null) {
            features.put("cacheTtl", cacheableEntity.ttl());
        }

        WorkflowEnabled workflowEnabled = entityClass.getAnnotation(WorkflowEnabled.class);
        features.put("workflowEnabled", workflowEnabled != null);
        if (workflowEnabled != null) {
            features.put("workflowStates", Arrays.asList(workflowEnabled.states()));
            features.put("workflowInitialState", workflowEnabled.initialState());
            features.put("workflowStateField", workflowEnabled.stateField());
        }

        // Build permission metadata
        EntityMetadataDTO.PermissionMetadata permissions = null;
        if (resourcePermission != null) {
            String res = resourcePermission.value();
            permissions = EntityMetadataDTO.PermissionMetadata.builder()
                    .resource(res)
                    .create(res + "_CREATE")
                    .read(res + "_READ")
                    .update(res + "_UPDATE")
                    .delete(res + "_DELETE")
                    .build();
        }

        // Build menu metadata
        EntityMetadataDTO.MenuMetadata menu = null;
        if (resourceMenu != null) {
            menu = EntityMetadataDTO.MenuMetadata.builder()
                    .title(resourceMenu.title())
                    .group(resourceMenu.group())
                    .icon(resourceMenu.icon())
                    .url(resourceMenu.url())
                    .order(resourceMenu.order())
                    .permission(resourceMenu.permission())
                    .build();
        }

        // Build CRUD config
        EntityMetadataDTO.CrudConfig crud = null;
        if (autoCrud != null) {
            crud = EntityMetadataDTO.CrudConfig.builder()
                    .enableExport(autoCrud.enableExport())
                    .enableImport(autoCrud.enableImport())
                    .enableBulkDelete(autoCrud.enableBulkDelete())
                    .path(autoCrud.path().isEmpty() ? entityName.toLowerCase() + "s" : autoCrud.path())
                    .build();
        }

        // Determine API path
        String apiPath = "";
        if (autoCrud != null && !autoCrud.path().isEmpty()) {
            apiPath = "/api/" + autoCrud.path();
        } else if (resourceMenu != null) {
            apiPath = "/api" + resourceMenu.url();
        }

        return EntityMetadataDTO.builder()
                .entityName(entityName)
                .label(entityLabel != null ? entityLabel.name() : entityName)
                .pluralLabel(entityLabel != null && !entityLabel.plural().isEmpty()
                        ? entityLabel.plural()
                        : entityName + "s")
                .description(entityLabel != null ? entityLabel.description() : "")
                .apiPath(apiPath)
                .resource(resourcePermission != null ? resourcePermission.value() : "")
                .fields(fields)
                .searchableFields(searchable != null
                        ? Arrays.asList(searchable.fields())
                        : Collections.emptyList())
                .filterableFields(filterable != null
                        ? Arrays.asList(filterable.fields())
                        : Collections.emptyList())
                .sortableFields(sortable != null
                        ? Arrays.asList(sortable.fields())
                        : Collections.emptyList())
                .permissions(permissions)
                .menu(menu)
                .crud(crud)
                .features(features)
                .build();
    }

    private List<FieldMetadataDTO> buildFieldMetadata(
            Class<?> entityClass,
            Searchable searchable,
            Filterable filterable,
            Sortable sortable) {

        Set<String> searchableFields = searchable != null
                ? new HashSet<>(Arrays.asList(searchable.fields()))
                : Collections.emptySet();
        Set<String> filterableFields = filterable != null
                ? new HashSet<>(Arrays.asList(filterable.fields()))
                : Collections.emptySet();
        Set<String> sortableFields = sortable != null
                ? new HashSet<>(Arrays.asList(sortable.fields()))
                : Collections.emptySet();

        List<FieldMetadataDTO> fields = new ArrayList<>();
        List<Field> allFields = getAllFields(entityClass);

        for (Field field : allFields) {
            if (field.isAnnotationPresent(Transient.class)) continue;
            if (field.getName().equals("serialVersionUID")) continue;

            FieldMeta meta = field.getAnnotation(FieldMeta.class);
            String fieldName = field.getName();

            FieldMetadataDTO.FieldMetadataDTOBuilder builder = FieldMetadataDTO.builder()
                    .name(fieldName)
                    .label(meta != null && !meta.label().isEmpty() ? meta.label() : humanize(fieldName))
                    .type(resolveFieldType(field, meta))
                    .uiType(meta != null && !meta.uiType().isEmpty() ? meta.uiType() : "")
                    .required(isRequired(field, meta))
                    .hidden(meta != null && meta.hidden())
                    .readOnly(meta != null && meta.readOnly())
                    .sortable(sortableFields.contains(fieldName))
                    .filterable(filterableFields.contains(fieldName))
                    .searchable(searchableFields.contains(fieldName))
                    .placeholder(meta != null ? meta.placeholder() : "")
                    .order(meta != null ? meta.order() : 0)
                    .group(meta != null ? meta.group() : "")
                    .description(meta != null ? meta.description() : "");

            // Validation
            FieldMetadataDTO.ValidationMetadata validation = buildValidation(field, meta);
            builder.validation(validation);

            if (validation != null) {
                if (validation.getMin() != null) builder.minLength(validation.getMin());
                if (validation.getMax() != null) builder.maxLength(validation.getMax());
            }

            // Enum values
            if (meta != null && meta.enumValues().length > 0) {
                builder.enumValues(Arrays.asList(meta.enumValues()));
            } else if (field.getType().isEnum()) {
                builder.enumValues(Arrays.stream(field.getType().getEnumConstants())
                        .map(Object::toString)
                        .collect(Collectors.toList()));
            }

            // Relation
            if (meta != null && !meta.relation().isEmpty()) {
                builder.relation(FieldMetadataDTO.RelationMetadata.builder()
                        .entity(meta.relation())
                        .displayField(meta.relationDisplay().isEmpty() ? "name" : meta.relationDisplay())
                        .type(resolveRelationType(field))
                        .build());
            } else if (field.isAnnotationPresent(ManyToOne.class)) {
                builder.relation(FieldMetadataDTO.RelationMetadata.builder()
                        .entity(field.getType().getSimpleName())
                        .displayField("name")
                        .type("many-to-one")
                        .build());
            } else if (field.isAnnotationPresent(ManyToMany.class) || field.isAnnotationPresent(OneToMany.class)) {
                builder.relation(FieldMetadataDTO.RelationMetadata.builder()
                        .entity(resolveGenericType(field))
                        .displayField("name")
                        .type(field.isAnnotationPresent(ManyToMany.class) ? "many-to-many" : "one-to-many")
                        .build());
            }

            fields.add(builder.build());
        }

        return fields;
    }

    private String resolveFieldType(Field field, FieldMeta meta) {
        if (meta != null && !meta.type().isEmpty() && !"text".equals(meta.type())) {
            return meta.type();
        }

        Class<?> type = field.getType();
        if (type == String.class) return "text";
        if (type == Long.class || type == long.class ||
            type == Integer.class || type == int.class ||
            type == Double.class || type == double.class ||
            type == Float.class || type == float.class) return "number";
        if (type == Boolean.class || type == boolean.class) return "boolean";
        if (type.getName().contains("LocalDate")) return "date";
        if (type.isEnum()) return "select";
        if (Collection.class.isAssignableFrom(type)) return "relation";
        return "text";
    }

    private boolean isRequired(Field field, FieldMeta meta) {
        if (meta != null && meta.required()) return true;
        if (field.isAnnotationPresent(NotNull.class)) return true;
        if (field.isAnnotationPresent(NotBlank.class)) return true;
        if (field.isAnnotationPresent(NotEmpty.class)) return true;

        Column column = field.getAnnotation(Column.class);
        return column != null && !column.nullable();
    }

    private FieldMetadataDTO.ValidationMetadata buildValidation(Field field, FieldMeta meta) {
        FieldMetadataDTO.ValidationMetadata.ValidationMetadataBuilder builder =
                FieldMetadataDTO.ValidationMetadata.builder();
        boolean hasValidation = false;

        if (field.isAnnotationPresent(NotNull.class)) {
            builder.notNull(true);
            hasValidation = true;
        }
        if (field.isAnnotationPresent(NotBlank.class)) {
            builder.notBlank(true);
            hasValidation = true;
        }

        Column column = field.getAnnotation(Column.class);
        if (column != null && column.unique()) {
            builder.unique(true);
            hasValidation = true;
        }

        Size size = field.getAnnotation(Size.class);
        if (size != null) {
            builder.min(size.min());
            builder.max(size.max());
            hasValidation = true;
        }

        if (column != null && column.length() != 255) {
            builder.max(column.length());
            hasValidation = true;
        }

        Pattern pattern = field.getAnnotation(Pattern.class);
        if (pattern != null) {
            builder.pattern(pattern.regexp());
            builder.message(pattern.message());
            hasValidation = true;
        }

        return hasValidation ? builder.build() : null;
    }

    private String resolveRelationType(Field field) {
        if (field.isAnnotationPresent(ManyToOne.class)) return "many-to-one";
        if (field.isAnnotationPresent(OneToMany.class)) return "one-to-many";
        if (field.isAnnotationPresent(ManyToMany.class)) return "many-to-many";
        if (field.isAnnotationPresent(OneToOne.class)) return "one-to-one";
        return "unknown";
    }

    private String resolveGenericType(Field field) {
        java.lang.reflect.Type genericType = field.getGenericType();
        if (genericType instanceof java.lang.reflect.ParameterizedType pt) {
            java.lang.reflect.Type[] typeArgs = pt.getActualTypeArguments();
            if (typeArgs.length > 0) {
                String typeName = typeArgs[0].getTypeName();
                return typeName.substring(typeName.lastIndexOf('.') + 1);
            }
        }
        return "Unknown";
    }

    private String humanize(String fieldName) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < fieldName.length(); i++) {
            char c = fieldName.charAt(i);
            if (i == 0) {
                result.append(Character.toUpperCase(c));
            } else if (Character.isUpperCase(c)) {
                result.append(' ').append(c);
            } else {
                result.append(c);
            }
        }
        return result.toString();
    }

    private List<Field> getAllFields(Class<?> type) {
        List<Field> fields = new ArrayList<>();
        while (type != null && type != Object.class) {
            fields.addAll(Arrays.asList(type.getDeclaredFields()));
            type = type.getSuperclass();
        }
        return fields;
    }
}
