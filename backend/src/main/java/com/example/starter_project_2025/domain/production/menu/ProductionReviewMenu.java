package com.example.starter_project_2025.domain.production.menu;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

/**
 * Sidebar entry for the teacher review queue ({@code /production/review}), where
 * AI-generated prompts pending review are approved into (or rejected from) the
 * shared practice pool.
 *
 * <p>Pure marker class (not an entity) — {@code AutoMenuInitializer} scans for
 * {@link ResourceMenu} and creates the backing {@code modules} row. Gated by
 * {@code SCENARIO_STUB_UPDATE} so only teachers/admins who can approve see it,
 * matching the {@code /api/production/prompts/**} approval endpoints.
 */
@ResourceMenu(
        title = "Duyệt câu AI",
        group = "Tiếng Nhật",
        icon = "clipboard-check",
        url = "/production/review",
        order = 9,
        permission = "SCENARIO_STUB_UPDATE",
        description = "Duyệt hoặc loại các câu luyện tập do AI sinh ra trước khi đưa vào kho dùng chung."
)
public class ProductionReviewMenu {
}
