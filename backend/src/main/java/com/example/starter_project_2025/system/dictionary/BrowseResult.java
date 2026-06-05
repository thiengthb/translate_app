package com.example.starter_project_2025.system.dictionary;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Trang kết quả cho màn "Từ vựng tổng hợp" (browse toàn bộ từ vựng / kanji
 * có lọc theo level). Dùng chung cho cả hai loại item.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BrowseResult<T> {
    List<T> items;
    int page;
    int size;
    long totalItems;
    int totalPages;
}
