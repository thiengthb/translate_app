package com.example.starter_project_2025.domain.production.menu;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

/**
 * Sidebar entry for the merged sentence-production page ({@code /production}).
 *
 * <p>This page combines the old random "Luyện viết câu" and the grammar "Luyện theo bộ"
 * (drill) flows: leave the grammar selector empty for a random AI-composed exercise, or
 * pick one or more grammar points to drill exactly those.
 *
 * <p>This is NOT an entity — it is a pure marker class. {@code AutoMenuInitializer}
 * scans for {@link ResourceMenu} (on any type, not just entities) and creates the
 * backing {@code modules} row so the static React route appears in the sidebar.
 *
 * <p>No {@code permission} is set, so the entry is visible to every authenticated
 * user — matching the open {@code /api/production} endpoints.
 */
@ResourceMenu(
        title = "Sentence Practice",
        group = "Tiếng Nhật",
        icon = "pencil",
        url = "/sentence_practice",
        order = 8,
        description = "Luyện viết câu tiếng Nhật: AI sinh đề ngẫu nhiên, hoặc chọn mẫu ngữ pháp để luyện theo bộ."
)
public class ProductionMenu {
}
