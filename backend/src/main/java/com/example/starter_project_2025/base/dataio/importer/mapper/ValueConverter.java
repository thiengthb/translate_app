package com.example.starter_project_2025.base.dataio.importer.mapper;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class ValueConverter {

    public Object convert(Class<?> type, String raw) {
        return convert(type, raw, "");
    }

    public Object convert(Class<?> type, String raw, String dateFormat) {

        if (raw == null || raw.isBlank())
            return null;

        String val = raw.trim();

        if (type == String.class)
            return val;

        if (type == Long.class || type == long.class)
            return Long.valueOf(val);

        if (type == Integer.class || type == int.class)
            return Integer.valueOf(val);

        if (type == Boolean.class || type == boolean.class)
            return Boolean.valueOf(val);

        if (type == Double.class || type == double.class)
            return Double.valueOf(val);

        if (type == java.util.UUID.class)
            return java.util.UUID.fromString(val);

        if (type.isEnum()) {
            @SuppressWarnings({ "unchecked", "rawtypes" })
            Enum enumVal = Enum.valueOf((Class<Enum>) type, val);
            return enumVal;
        }

        if (type == LocalDateTime.class) {
            if (dateFormat != null && !dateFormat.isBlank()) {
                return LocalDateTime.parse(val, DateTimeFormatter.ofPattern(dateFormat));
            }
            return LocalDateTime.parse(val);
        }

        if (type == LocalDate.class) {
            if (dateFormat != null && !dateFormat.isBlank()) {
                return LocalDate.parse(val, DateTimeFormatter.ofPattern(dateFormat));
            }
            return LocalDate.parse(val);
        }

        return raw;
    }
}
