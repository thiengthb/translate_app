package com.example.starter_project_2025.base.dataio.exporter.resolver;

import com.example.starter_project_2025.base.dataio.exporter.metadata.ExportFieldMeta;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.util.Collection;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class RelationResolverEngine {

    public Object resolve(Object value, ExportFieldMeta meta) {

        if (value == null) return "";

        if (value instanceof Collection<?> col) {
            return col.stream()
                    .map(item -> resolvePath(item, meta.path()))
                    .filter(Objects::nonNull)
                    .map(Object::toString)
                    .collect(Collectors.joining(meta.separator()));
        }

        return resolvePath(value, meta.path());
    }

    private Object resolvePath(Object obj, String path) {

        if (obj == null || path.isBlank())
            return obj;

        try {
            Object current = obj;

            for (String part : path.split("\\.")) {
                // Unwrap lazy Hibernate proxies (e.g. a LAZY @ManyToOne such as
                // Word.representation) so field reflection hits the real entity
                // class — a proxy's runtime class is a subclass and its own field
                // slots are never populated.
                current = Hibernate.unproxy(current);

                Field f = findField(current.getClass(), part);
                f.setAccessible(true);
                current = f.get(current);

                if (current == null) return null;
            }

            return current;

        } catch (Exception e) {
            throw new RuntimeException("Cannot resolve relation path: " + path, e);
        }
    }

    // Walk up the class hierarchy so inherited fields (e.g. on BaseEntity) and
    // proxy superclasses resolve correctly.
    private Field findField(Class<?> type, String name) throws NoSuchFieldException {
        for (Class<?> c = type; c != null && c != Object.class; c = c.getSuperclass()) {
            try {
                return c.getDeclaredField(name);
            } catch (NoSuchFieldException ignored) {
                // try superclass
            }
        }
        throw new NoSuchFieldException(name);
    }
}
