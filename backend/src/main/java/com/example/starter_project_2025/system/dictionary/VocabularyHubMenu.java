package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

/**
 * Marker class chỉ để sinh mục menu sidebar "Từ vựng tổng hợp" (/vocabulary).
 *
 * <p>Trang này hiển thị toàn bộ danh sách từ vựng & kanji (phân trang) và cho
 * người dùng lọc theo level JLPT — dữ liệu lấy qua
 * {@code GET /api/dictionary/browse/words} và {@code /browse/kanjis} trong
 * {@link DictionaryController}, không có entity riêng. Giống
 * {@link NotebookMenu}, class rỗng này tồn tại chỉ để {@code AutoMenuInitializer}
 * quét được {@code @ResourceMenu} và tạo dòng Module trong DB → FE sidebar.
 * Không đặt {@code permission} nên mọi người dùng đã đăng nhập đều thấy.
 */
@ResourceMenu(
        title = "Từ vựng tổng hợp",
        group = "Language",
        icon = "layers",
        url = "/vocabulary",
        description = "Danh sách toàn bộ từ vựng và kanji, lọc theo level JLPT.",
        order = 3
)
public class VocabularyHubMenu {
}