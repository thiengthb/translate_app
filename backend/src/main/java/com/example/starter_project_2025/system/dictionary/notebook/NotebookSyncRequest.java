package com.example.starter_project_2025.system.dictionary.notebook;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Payload đồng bộ một chiều từ client: các mục đang nằm trong localStorage
 * (lưu từ trước khi có backend, hoặc lưu lúc offline) được merge vào sổ tay
 * trên server. Idempotent — mục đã có trên server thì bỏ qua.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotebookSyncRequest {
    List<Long>   wordIds;
    List<String> kanjiChars;
}