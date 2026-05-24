package com.example.starter_project_2025.base.metadata.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityMetadataDTO {

    private String entityName;
    private String label;
    private String pluralLabel;
    private String description;
    private String apiPath;
    private String resource;
    private List<FieldMetadataDTO> fields;
    private List<String> searchableFields;
    private List<String> filterableFields;
    private List<String> sortableFields;
    private PermissionMetadata permissions;
    private MenuMetadata menu;
    private CrudConfig crud;
    private Map<String, Object> features;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PermissionMetadata {
        private String resource;
        private String create;
        private String read;
        private String update;
        private String delete;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MenuMetadata {
        private String title;
        private String group;
        private String icon;
        private String url;
        private int order;
        private String permission;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CrudConfig {
        private boolean enableExport;
        private boolean enableImport;
        private boolean enableBulkDelete;
        private String path;
    }
}
