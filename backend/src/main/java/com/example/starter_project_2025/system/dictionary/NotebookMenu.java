package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

/**
 * Marker class chỉ để sinh mục menu sidebar "Sổ tay" (/notebook).
 *
 * <p>Sổ tay là tính năng thuần frontend — danh sách từ vựng & kanji đã lưu nằm
 * trong localStorage của trình duyệt, không có entity/endpoint backend. Class
 * rỗng này tồn tại chỉ để {@code AutoMenuInitializer} quét được {@code @ResourceMenu}
 * và tạo một dòng Module trong DB → FE sidebar query hiện ra mục "Sổ tay" ngay
 * cạnh "Từ điển" (cùng nhóm "Language"). Không đặt {@code permission} nên mọi
 * người dùng đã đăng nhập đều thấy, giống mục Từ điển.
 */
@ResourceMenu(
        title = "Sổ tay",
        group = "Language",
        icon = "bookmark",
        url = "/notebook",
        description = "Từ vựng và kanji bạn đã lưu.",
        order = 2
)
public class NotebookMenu {
}