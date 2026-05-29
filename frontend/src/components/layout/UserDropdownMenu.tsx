import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    Check,
    Keyboard,
    LogOut,
    Settings,
    User as UserIcon,
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEME_OPTIONS } from "@/components/ToggleTheme";

import { profileApi } from "@/api/features/profile.api";
import { useTranslation } from "@/contexts/I18nContext";
import { useLogout } from "@/hooks/useLogout";
import { useThemePreference } from "@/hooks/useThemePreference";
import type { Locale } from "@/i18n";
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
    /** Optional shortcuts dialog opener. */
    onOpenShortcuts?: () => void;
}

/**
 * Single source of truth for "current user" controls.
 *
 *   ┌─────────────────────────┐
 *   │ [Avatar + Name + Email] │
 *   ├─────────────────────────┤
 *   │ 👤 Trang cá nhân         │
 *   ├─────────────────────────┤
 *   │ ⌨ Phím tắt          ?   │
 *   │ ⚙ Tùy chỉnh         →   │  ← single submenu (language + theme combined)
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
    onOpenShortcuts,
}: UserDropdownMenuProps) {
    const navigate = useNavigate();
    const { firstName, lastName, email } = useSelector(
        (state: RootState) => state.auth,
    );
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
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

                <DropdownMenuSeparator />

                {/* ── Account ──────────────────────────────────────────── */}
                <DropdownMenuItem
                    onSelect={() => navigate("/profile")}
                    className="gap-2 text-sm cursor-pointer"
                >
                    <UserIcon size={14} className="opacity-70" />
                    <span className="flex-1">{t("nav.profile")}</span>
                </DropdownMenuItem>

                {/* ── Tools ────────────────────────────────────────────── */}
                {onOpenShortcuts && (
                    <DropdownMenuItem
                        onSelect={onOpenShortcuts}
                        className="gap-2 text-sm cursor-pointer"
                    >
                        <Keyboard size={14} className="opacity-70" />
                        <span className="flex-1">Phím tắt</span>
                        <kbd className="text-[10px] text-muted-foreground tabular-nums">
                            ?
                        </kbd>
                    </DropdownMenuItem>
                )}

                {/* ── Single "Settings" submenu — replaces inline lang+theme row ── */}
                <PreferencesSubMenu />

                <DropdownMenuSeparator />

                {/* ── Logout ───────────────────────────────────────────── */}
                <DropdownMenuItem
                    onSelect={handleLogout}
                    className="gap-2 text-sm text-rose-600 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer"
                >
                    <LogOut size={14} />
                    <span className="flex-1">{t("nav.logout")}</span>
                    <kbd className="text-[10px] text-muted-foreground tabular-nums">
                        ⇧+L
                    </kbd>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ─── Settings submenu (language + theme inline as one slide-out) ───────────
function PreferencesSubMenu() {
    const { t, locale, setLocale, locales } = useTranslation();
    const { themePreference, setThemePreference } = useThemePreference();

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 text-sm">
                <Settings size={14} className="opacity-70" />
                <span>Tùy chỉnh</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
                {/* Language */}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Ngôn ngữ
                </DropdownMenuLabel>
                {locales.map((l) => {
                    const active = l.code === locale;
                    return (
                        <DropdownMenuItem
                            key={l.code}
                            onSelect={() => setLocale(l.code as Locale)}
                            className={cn(
                                "gap-2 text-sm cursor-pointer",
                                active && "bg-accent",
                            )}
                        >
                            <span aria-hidden>{l.flag}</span>
                            <span className="flex-1">{t(l.labelKey)}</span>
                            {active && (
                                <Check size={13} className="text-primary" />
                            )}
                        </DropdownMenuItem>
                    );
                })}

                <DropdownMenuSeparator />

                {/* Theme */}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Giao diện
                </DropdownMenuLabel>
                {THEME_OPTIONS.map(({ value, label, Icon }) => {
                    const active = themePreference === value;
                    return (
                        <DropdownMenuItem
                            key={value}
                            onSelect={() => setThemePreference(value)}
                            className={cn(
                                "gap-2 text-sm cursor-pointer",
                                active && "bg-accent",
                            )}
                        >
                            <Icon size={14} className="opacity-70" />
                            <span className="flex-1">{label}</span>
                            {active && (
                                <Check size={13} className="text-primary" />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuSubContent>
        </DropdownMenuSub>
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
