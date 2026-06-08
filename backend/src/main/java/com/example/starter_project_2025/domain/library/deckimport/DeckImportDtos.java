package com.example.starter_project_2025.domain.library.deckimport;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class DeckImportDtos {

    private DeckImportDtos() {
    }

    public enum DelimiterOption {
        AUTO,
        COMMA,
        TAB,
        SEMICOLON,
        PIPE
    }

    public enum ImportTargetField {
        IGNORE,
        FRONT,
        BACK,
        READING,
        ROMAJI,
        ONYOMI,
        KUNYOMI,
        EXAMPLE,
        EXAMPLE_TRANSLATION,
        NOTE,
        TAGS
    }

    public enum DuplicateStrategy {
        SKIP,
        UPDATE,
        CREATE_NEW
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviewResponse {
        String token;
        String fileName;
        String delimiter;
        boolean headerDetected;
        int totalRows;
        int previewPage;
        int previewRows;
        int totalPages;
        int columnCount;
        @Builder.Default
        List<ColumnPreview> columns = new ArrayList<>();
        @Builder.Default
        List<RowPreview> rows = new ArrayList<>();
        @Builder.Default
        Map<String, ImportTargetField> suggestedMapping = new HashMap<>();
        @Builder.Default
        List<String> warnings = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColumnPreview {
        String key;
        String label;
        int index;
        ImportTargetField suggestedField;
        @Builder.Default
        List<String> samples = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowPreview {
        int rowNumber;
        @Builder.Default
        Map<String, String> values = new HashMap<>();
        @Builder.Default
        List<String> warnings = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfirmRequest {
        String token;
        Long deckId;
        DeckTarget deck;
        DuplicateStrategy duplicateStrategy;
        Map<String, ImportTargetField> mapping;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeckTarget {
        String title;
        String description;
        Long folderId;
        String visibility;
        String deckIcon;
        String deckColor;
        String sourceLanguage;
        String targetLanguage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportResultResponse {
        Long batchId;
        Long deckId;
        String deckTitle;
        ImportBatchStatus status;
        int totalRows;
        int createdRows;
        int updatedRows;
        int skippedRows;
        int failedRows;
        int duplicateRows;
        @Builder.Default
        List<RowError> errors = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowError {
        int rowNumber;
        String message;
        @Builder.Default
        Map<String, Object> rawData = new HashMap<>();
    }
}
