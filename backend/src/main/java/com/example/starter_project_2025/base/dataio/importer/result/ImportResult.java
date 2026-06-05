package com.example.starter_project_2025.base.dataio.importer.result;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportResult {

    int successCount;
    int failureCount;
    // Số dòng bị bỏ qua có chủ đích (vd: từ vựng đã tồn tại → tránh trùng).
    // Khác failure: dòng vẫn hợp lệ, chỉ là không nhập lại. Mặc định 0.
    int skippedCount;
    List<RowError> errors = new ArrayList<>();
}