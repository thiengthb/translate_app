import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Flame, MoreHorizontal } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { HeaderActionButton } from "./HeaderActionButton";
import type { RootState } from "@/store/store";

interface MoreMenuProps {
    /** Streak count to show inline (mobile substitute for StreakBadge). */
    streakCount?: number;
}

/**
 * Mobile overflow menu for the right cluster of the header.
 *
 *   Authenticated user (mobile):
 *     [🔥 Streak count]
 *     (Lang / theme / shortcuts already live in the avatar dropdown —
 *      no duplication here.)
 *
 *   Guest visitor (mobile):
 *     [🌐] [🌗]
 *     (No avatar to nest preferences inside, so they live here.)
 *
 * Rendered alongside the icon row, hidden by `md:` from the parent —
 * never both visible at once.
 */
export function MoreMenu({ streakCount }: MoreMenuProps) {
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector(
        (state: RootState) => state.auth,
    );

    const showStreak =
        isAuthenticated &&
        typeof streakCount === "number" &&
        streakCount > 0;
    const showGuestPrefs = !isAuthenticated;

    // Nothing to surface? Don't render an empty trigger.
    if (!showStreak && !showGuestPrefs) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <HeaderActionButton
                    tooltip="Tùy chọn khác"
                    icon={<MoreHorizontal size={16} />}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {showStreak && (
                    /* Clickable item — desktop has StreakBadge in header,
                       but mobile users would otherwise have no entry into
                       the streak record. The streak now lives on the
                       dashboard's "Record" calendar. Navigate on tap. */
                    <DropdownMenuItem
                        onSelect={() => navigate("/dashboard")}
                        className="gap-2 text-sm cursor-pointer"
                    >
                        <Flame size={14} className="text-orange-500" />
                        <span className="flex-1">Streak</span>
                        <span className="text-xs font-semibold tabular-nums text-orange-600">
                            {streakCount}
                        </span>
                    </DropdownMenuItem>
                )}

                {showStreak && showGuestPrefs && <DropdownMenuSeparator />}

                {showGuestPrefs && (
                    <>
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            Tùy chỉnh
                        </DropdownMenuLabel>
                        <div className="px-1 pb-1 flex items-center gap-1">
                            <LanguageSwitcher />
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
