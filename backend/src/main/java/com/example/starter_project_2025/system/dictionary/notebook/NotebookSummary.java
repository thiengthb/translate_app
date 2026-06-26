package com.example.starter_project_2025.system.dictionary.notebook;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/** Tóm tắt một sổ tay (cho danh sách + picker): tên, màu, số mục đã lưu. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotebookSummary {
    Long id;
    String name;
    String color;
    boolean isDefault;
    int sortOrder;
    long wordCount;
    long kanjiCount;
    LocalDateTime createdAt;
}