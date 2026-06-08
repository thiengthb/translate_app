import { useSelector } from "react-redux";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CoolThemeToggle } from "@/components/lightswind/cool-theme-toggle";
import NotificationCenter from "@/components/notification/NotificationCenter";
import ToggleTheme from "@/components/ToggleTheme";
import { StreakBadge } from "@/components/streak/StreakBadge";
import { Badge } from "@/components/ui/badge.tsx";
import { Separator } from "@/components/ui/separator";

import { MoreMenu } from "@/components/layout/header/MoreMenu";
import { RoleSwitcher } from "@/components/layout/header/RoleSwitcher";
import { UserDropdownMenu } from "@/components/layout/UserDropdownMenu";

import { useRoleSwitch } from "@/contexts/RoleSwitchContext";
import { useMyStreak } from "@/hooks/useStreak";
import { useThemePreference } from "@/hooks/useThemePreference";
import type { RootState } from "@/store/store";

/**
 * Authenticated-user header actions, right-aligned in the top bar.
 *
 *   Desktop (md+):
 *     [Role ▾]  [Preview]  [🔥 Streak]  │  [🔔]  [👤 ▾]
 *                                              │
 *                                              ├─ Trang cá nhân
 *                                              ├─ Phím tắt
 *                                              ├─ TÙY CHỈNH  [🌐] [🌗]
 *                                              └─ Đăng xuất
 *
 *   Mobile (< md):
 *     [Role ▾]                            [🔔] [⋯] [👤 ▾]
 *                                               └─ Streak count
 *
 * Why language / theme / shortcuts moved into the avatar:
 *   - Reduces icon-button noise in the bar (was 5+ standalone buttons).
 *   - Pairs settings-like actions with the identity dropdown — natural
 *     mental model: "this is where I configure ME".
 *   - One canonical location works for both header and sidebar footer.
 *
 * Unauthenticated state falls through to minimal lang + theme toggles,
 * since the user has no avatar to hide them behind yet.
 */
export default function HeaderRight() {
    const { isAuthenticated, role, roles } = useSelector(
        (state: RootState) => state.auth,
    );
    const { isPreviewMode } = useRoleSwitch();
    const { data: streak } = useMyStreak(isAuthenticated);
    const { isDark, setThemePreference } = useThemePreference();
    const toggleTheme = () => setThemePreference(isDark ? "light" : "dark");

    // Unauthenticated → minimal chrome. Used by GuestLayout's auth pages.
    if (!role) {
        return (
            <div className="flex items-center gap-1">
                <LanguageSwitcher />
                <ToggleTheme />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 sm:gap-2">
            <RoleSwitcher primaryRole={role} roles={roles} />

            {isPreviewMode && (
                <Badge
                    variant="secondary"
                    className="hidden sm:inline-flex text-[10px] uppercase tracking-wide"
                >
                    Preview
                </Badge>
            )}

            <Separator
                orientation="vertical"
                className="!h-6 mx-1 hidden sm:block"
            />

            {/* Desktop-only quick stat */}
            <div className="hidden md:flex items-center gap-0.5">
                <StreakBadge />
            </div>

            {/* Light/dark switch — sits between streak and the inbox */}
            <CoolThemeToggle
                isDark={isDark}
                onToggle={toggleTheme}
                size="md"
            />

            {/* Always-visible inbox */}
            <NotificationCenter />

            {/* Mobile: streak collapses into MoreMenu */}
            <div className="md:hidden">
                <MoreMenu streakCount={streak?.currentStreak} />
            </div>

            {/* Settings + identity + logout — one consolidated dropdown */}
            <UserDropdownMenu variant="compact" side="bottom" />
        </div>
    );
}
