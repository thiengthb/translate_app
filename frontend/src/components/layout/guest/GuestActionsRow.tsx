import { ArrowRight, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import NotificationCenter from "@/components/notification/NotificationCenter";
import ToggleTheme from "@/components/ToggleTheme";
import { MoreMenu } from "@/components/layout/header/MoreMenu";
import { UserDropdownMenu } from "@/components/layout/UserDropdownMenu";

import { useTranslation } from "@/contexts/I18nContext";
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
export function GuestActionsRow({ isAuthPage }: GuestActionsRowProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
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

    // Unauthenticated visitor — no avatar to nest settings inside, keep
    // language + theme inline (or in MoreMenu on mobile).
    return (
        <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden md:flex items-center gap-0.5">
                <LanguageSwitcher />
                <ToggleTheme />
            </div>

            <div className="md:hidden">
                <MoreMenu />
            </div>

            {!isAuthPage && (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/login")}
                        className="gap-1.5"
                    >
                        <LogIn size={15} />
                        <span className="hidden sm:inline">{t("nav.login")}</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => navigate("/register")}
                        className="gap-1.5"
                    >
                        <span>{t("nav.register")}</span>
                        <ArrowRight size={15} className="hidden sm:inline" />
                    </Button>
                </>
            )}
        </div>
    );
}
