import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    Coins,
    LogOut,
    Trophy,
    User as UserIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { profileApi } from "@/api/features/profile.api";
import { rewardApi, type RewardBalance } from "@/api/features/reward.api";
import { useTranslation } from "@/contexts/I18nContext";
import { useLogout } from "@/hooks/useLogout";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store/store";

type Variant = "compact" | "full";
type Side = "top" | "bottom" | "left" | "right";

interface UserDropdownMenuProps {
    /**
     * `compact` → avatar circle only (header).
     * `full`    → avatar + name + email row (sidebar footer).
     */
    variant?: Variant;
    /** Where the dropdown content opens. */
    side?: Side;
}

/**
 * Single source of truth for "current user" controls.
 *
 *   ┌─────────────────────────┐
 *   │ [Avatar + Name + Email] │
 *   ├─────────────────────────┤
 *   │ 👤 Trang cá nhân         │
 *   ├─────────────────────────┤
 *   │ 🚪 Đăng xuất       ⇧+L  │
 *   └─────────────────────────┘
 *
 *   On hover/click "Tùy chỉnh":
 *   ┌──────────────────────────┐
 *   │ Ngôn ngữ                 │
 *   │ ✓ 🇻🇳 Tiếng Việt          │
 *   │   🇬🇧 English             │
 *   │ ─────────                │
 *   │ Giao diện                │
 *   │   ☀ Light                │
 *   │ ✓ 🌙 Dark                │
 *   │   💻 Theo hệ thống       │
 *   └──────────────────────────┘
 *
 * Language and theme used to be two separate icon buttons; they're now
 * one menu entry that opens a submenu with both. State comes from
 * `useTranslation()` (i18n context) and `useThemePreference()` (hook),
 * both of which are also wired into the standalone components used in
 * the guest navbar — single source of truth.
 */
export function UserDropdownMenu({
    variant = "compact",
    side = "bottom",
}: UserDropdownMenuProps) {
    const navigate = useNavigate();
    const { firstName, lastName, email } = useSelector(
        (state: RootState) => state.auth,
    );
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [balance, setBalance] = useState<RewardBalance | null>(null);
    const { t } = useTranslation();
    const handleLogout = useLogout();

    const initials =
        [firstName?.charAt(0), lastName?.charAt(0)]
            .filter(Boolean)
            .join("")
            .toUpperCase() ||
        email?.charAt(0)?.toUpperCase() ||
        "?";
    const fullName =
        [firstName, lastName].filter(Boolean).join(" ") || email || "User";

    useEffect(() => {
        let active = true;
        profileApi
            .getProfile()
            .then((data) => {
                if (active) setAvatarUrl(data.avatarUrl);
            })
            .catch(() => {});
        rewardApi
            .getMe()
            .then((data) => {
                if (active) setBalance(data);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const isFull = variant === "full";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="User menu"
                    className={cn(
                        "cursor-pointer transition-colors",
                        isFull
                            ? "flex items-center gap-2 min-w-0 flex-1 p-1 pr-2 rounded-md hover:bg-accent"
                            : "h-8 w-8 rounded-full overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/40",
                    )}
                >
                    <Avatar
                        avatarUrl={avatarUrl}
                        initials={initials}
                        sizeClass={isFull ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"}
                    />
                    {isFull && (
                        <div className="min-w-0 flex-1 text-left">
                            <p className="text-xs font-medium truncate leading-tight">
                                {fullName}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate leading-tight">
                                {email}
                            </p>
                        </div>
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side={side} align="end" className="w-60">
                {/* ── Identity ─────────────────────────────────────────── */}
                <DropdownMenuLabel className="flex items-center gap-2.5">
                    <Avatar
                        avatarUrl={avatarUrl}
                        initials={initials}
                        sizeClass="h-9 w-9 text-sm"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {email}
                        </p>
                    </div>
                </DropdownMenuLabel>

                {/* ── XP / Level / Coins ───────────────────────────────── */}
                {balance && (() => {
                    // Mirror the backend level curve. Cumulative XP to reach a
                    // level is the triangular number 100 * (lvl-1) * lvl / 2.
                    // Everything is guarded so a missing/NaN field never renders.
                    const expForLevel = (lvl: number) =>
                        lvl <= 1 ? 0 : (100 * (lvl - 1) * lvl) / 2;
                    const levelForExp = (xp: number) => {
                        let lvl = 1;
                        while (lvl < 100 && expForLevel(lvl + 1) <= xp) lvl++;
                        return lvl;
                    };
                    const exp = Number.isFinite(balance.exp) ? balance.exp : 0;
                    const coins = Number.isFinite(balance.coins) ? balance.coins : 0;
                    // Prefer the backend level; fall back to deriving it from exp.
                    const level =
                        Number.isFinite(balance.level) && balance.level > 0
                            ? balance.level
                            : levelForExp(exp);
                    const currentLevelExp = expForLevel(level);
                    const nextLevelExp = expForLevel(level + 1);
                    const levelSpan = Math.max(1, nextLevelExp - currentLevelExp);
                    const expIntoLevel = Math.max(0, exp - currentLevelExp);
                    const expToNext = Number.isFinite(balance.expToNext)
                        ? balance.expToNext
                        : Math.max(0, nextLevelExp - exp);
                    const progressPct = level >= 100
                        ? 100
                        : Math.min(100, Math.max(0, Math.round((expIntoLevel / levelSpan) * 100)));
                    return (
                        <div className="px-2 pt-0.5 pb-2 space-y-1.5">
                            {/* Level + coins — their own row */}
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    <Trophy className="size-3" />Lv {level}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-yellow-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
                                    <Coins className="size-3" />{coins}
                                </span>
                            </div>
                            {/* XP progress — its own row */}
                            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground tabular-nums">
                                <span>{exp} XP</span>
                                <span>{expToNext === 0 ? "Max level" : `${expToNext} XP to Lv ${level + 1}`}</span>
                            </div>
                            <div
                                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                                title={`${expIntoLevel} / ${levelSpan} XP into Level ${level}`}
                            >
                                <div
                                    className="h-full rounded-full bg-primary transition-[width]"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>
                    );
                })()}

                <DropdownMenuSeparator />

                {/* ── Account ──────────────────────────────────────────── */}
                <MenuRow
                    icon={UserIcon}
                    label={t("nav.profile")}
                    onSelect={() => navigate("/profile")}
                />

                <DropdownMenuSeparator />

                {/* ── Logout ───────────────────────────────────────────── */}
                <MenuRow
                    icon={LogOut}
                    label={t("nav.logout")}
                    hint="⇧+L"
                    onSelect={handleLogout}
                    destructive
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ─── Menu row ────────────────────────────────────────────────────────────────
/**
 * Consistent dropdown row: icon in a soft rounded chip (tints to primary on
 * highlight), label, and an optional right-aligned keyboard hint.
 */
function MenuRow({
    icon: Icon,
    label,
    hint,
    onSelect,
    destructive = false,
}: {
    icon: LucideIcon;
    label: string;
    hint?: string;
    onSelect: () => void;
    destructive?: boolean;
}) {
    return (
        <DropdownMenuItem
            onSelect={onSelect}
            className={cn(
                "group gap-2.5 rounded-md px-2 py-2 text-sm cursor-pointer",
                destructive &&
                    "text-rose-600 focus:text-rose-600 focus:bg-rose-500/10",
            )}
        >
            <span
                className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    destructive
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-muted text-muted-foreground group-focus:bg-primary/10 group-focus:text-primary",
                )}
            >
                <Icon size={15} />
            </span>
            <span className="flex-1 font-normal">{label}</span>
            {hint && (
                <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                    {hint}
                </kbd>
            )}
        </DropdownMenuItem>
    );
}

// ─── Avatar primitive ───────────────────────────────────────────────────────
function Avatar({
    avatarUrl,
    initials,
    sizeClass,
}: {
    avatarUrl?: string;
    initials: string;
    sizeClass: string;
}) {
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt="Avatar"
                className={cn(
                    "rounded-full object-cover border shrink-0",
                    sizeClass,
                )}
            />
        );
    }
    return (
        <div
            className={cn(
                "rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0",
                sizeClass,
            )}
        >
            {initials}
        </div>
    );
}
