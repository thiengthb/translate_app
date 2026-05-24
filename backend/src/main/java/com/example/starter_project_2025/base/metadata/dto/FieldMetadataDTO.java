package com.example.starter_project_2025.base.metadata.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FieldMetadataDTO {

    private String name;
    private String label;
    private String type;
    private String uiType;
    private boolean required;
    private boolean hidden;
    private boolean readOnly;
    private boolean sortable;
    private boolean filterable;
    private boolean searchable;
    private String placeholder;
    private int order;
    private int minLength;
    private int maxLength;
    private Double min;
    private Double max;
    private String pattern;
    private String group;
    private String description;
    private List<String> enumValues;
    private RelationMetadata relation;
    private ValidationMetadata validation;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelationMetadata {
        private String entity;
        private String displayField;
        private String type;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationMetadata {
        private boolean notNull;
        private boolean notBlank;
        private boolean unique;
        private Integer min;
        private Integer max;
        private String pattern;
        private String message;
    }
}
