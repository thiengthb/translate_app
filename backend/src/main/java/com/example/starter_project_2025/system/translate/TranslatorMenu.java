package com.example.starter_project_2025.system.translate;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

/**
 * Sidebar entry for the translator page ({@code /analyze}).
 *
 * <p>Pure marker class (not an entity) — {@code AutoMenuInitializer} scans for
 * {@link ResourceMenu} on any type and creates the backing {@code modules} row
 * so the static React route ({@code /analyze} → {@code AnalyzePage}) shows up in
 * the sidebar. No {@code permission} is set, so every authenticated user sees it,
 * matching the open {@code /api/translate} and {@code /api/analyze} endpoints.
 */
@ResourceMenu(
        title = "Translator",
        group = "Tiếng Nhật",
        icon = "globe",
        url = "/translator",
        order = 10,
        description = "Dịch và phân tích câu tiếng Nhật: tách từ, ngữ pháp và các cách diễn đạt thay thế."
)
public class TranslatorMenu {
}
