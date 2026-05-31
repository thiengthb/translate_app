package com.example.starter_project_2025.domain.production.menu;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

/**
 * Sidebar entry for the vocabulary-driven grammar drill page ({@code /production/drill}).
 *
 * <p>This is NOT an entity — it is a pure marker class. {@code AutoMenuInitializer}
 * scans for {@link ResourceMenu} (on any type, not just entities) and creates the
 * backing {@code modules} row so the static React route appears in the sidebar.
 *
 * <p>No {@code permission} is set, so the entry is visible to every authenticated
 * user — matching the open {@code /api/production} endpoints.
 */
@ResourceMenu(
        title = "Luyện theo bộ",
        group = "Tiếng Nhật",
        icon = "pencil",
        url = "/production/drill",
        order = 8,
        description = "Luyện viết câu theo các mẫu ngữ pháp tự chọn, dùng từ vựng của bạn (AI tạo đề)."
)
public class ProductionDrillMenu {
}
