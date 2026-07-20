package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

/**
 * Marker class chỉ để sinh mục menu sidebar "Đọc hiểu" (/reader).
 *
 * <p>Trang học viên ({@code /reader}): liệt kê các bài đọc do admin soạn sẵn
 * (entity {@code ReadingPassage}, auto-CRUD) rồi mở từng bài để đọc — FE tách
 * từ + chú furigana qua {@code POST /api/analyze} (Sudachi), cho tra nhanh, lưu
 * vào sổ tay và nghe đọc cả bài. Bản thân danh sách/đọc gọi GET endpoint tự sinh
 * {@code /api/reading-passages}, menu này không trỏ tới entity nên cần marker
 * riêng. Giống {@link NotebookMenu} và {@link VocabularyHubMenu}, class rỗng này
 * chỉ để {@code AutoMenuInitializer} quét {@code @ResourceMenu} và tạo Module
 * trong DB → sidebar hiện mục "Đọc hiểu" (nhóm "Language"). Không đặt
 * {@code permission} nên mọi người dùng đã đăng nhập đều thấy.
 */
@ResourceMenu(
        title = "Đọc hiểu",
        group = "Language",
        icon = "book-open",
        url = "/reader",
        description = "Chọn một bài đọc, tra từ và nghe đọc cả bài.",
        order = 3
)
public class ReaderMenu {
}