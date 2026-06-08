import { useSelector } from "react-redux";

import { Badge } from "@/components/ui/badge";
import NotificationCenter from "@/components/notification/NotificationCenter";
import { MoreMenu } from "@/components/layout/header/MoreMenu";
import { UserDropdownMenu } from "@/components/layout/UserDropdownMenu";

import { usePermissions } from "@/hooks/usePermissions";
import { useMyStreak } from "@/hooks/useStreak";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

interface GuestActionsRowProps {
    /** Hide login/register buttons on `/login`, `/register`, etc. */
    isAuthPage: boolean;
}

/**
 * Right-side actions cluster for the guest header.
 *
 *   Authenticated user (student / teacher / admin browsing public):
 *     desktop  → [Role] [🔥 Streak]  [🔔] [👤 ▾]
 *                                           └─ Profile / Shortcuts / Lang / Theme / Logout
 *     mobile   → [🔔] [⋯] [👤 ▾]
 *                       └─ Streak count
 *
 *   Guest visitor (no account yet):
 *     desktop  → [🌐] [🌗]  [Đăng nhập] [Đăng ký →]
 *     mobile   → [⋯]  [Đăng nhập] [Đăng ký →]
 *                  └─ Lang / Theme inline (no avatar to hide them in)
 *
 * Settings actions (language, theme, shortcuts) consolidate inside the
 * avatar dropdown for AUTHENTICATED users — clears up the bar, gives
 * one canonical "me / settings" entry. Guests keep them inline since
 * they have no avatar yet.
 */
export function GuestActionsRow({}: GuestActionsRowProps) {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const { activeRole } = usePermissions();
    const { data: streak } = useMyStreak(isAuthenticated);

    if (isAuthenticated) {
        return (
            <div className="flex items-center gap-1 sm:gap-1.5">
                {activeRole && (
                    <Badge
                        variant="secondary"
                        className="hidden md:inline-flex text-xs"
                    >
                        {formatRoleLabel(activeRole)}
                    </Badge>
                )}

                {/* Desktop-only quick stats (mobile sees them in MoreMenu) */}
                {streak && (
                    <div className="hidden md:flex items-center">
                        {/* Streak handled by MoreMenu on mobile; component
                            renders its own pill on desktop via parent. */}
                    </div>
                )}

                <NotificationCenter />

                {/* Mobile: secondary stuff (streak count) lives here.
                    Lang/theme/shortcut have moved to avatar menu. */}
                <div className="md:hidden">
                    <MoreMenu streakCount={streak?.currentStreak} />
                </div>

                <UserDropdownMenu variant="compact" side="bottom" />
            </div>
        );
    }

    // Unauthenticated visitor — header actions removed; the landing page
    // already surfaces login/register in its hero.
    return null;
}
