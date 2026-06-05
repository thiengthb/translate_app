package com.example.starter_project_2025.domain.game.menu;

import com.example.starter_project_2025.init.annotation.ResourceMenu;

/**
 * Sidebar entry for the Kanji Radical game ({@code /games/kanji-radical}).
 *
 * <p>Pure marker class (not an entity) — {@code AutoMenuInitializer} scans for
 * {@link ResourceMenu} on any type and creates the backing {@code modules} row so
 * the static React route ({@code /games/kanji-radical} → {@code KanjiRadicalGamePage})
 * shows up in the sidebar. The board is fully client-side today, so no permission
 * is set and every authenticated user can play.
 */
@ResourceMenu(
        title = "Game Kanji Radical",
        group = "Tiếng Nhật",
        icon = "play",
        url = "/kanji-radical",
        order = 11,
        description = "Trò chơi ghép bộ thủ kanji."
)
public class KanjiRadicalGameMenu {
}
