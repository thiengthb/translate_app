import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
    BookOpen,
    BookText,
    ClipboardList,
    GraduationCap,
    Home,
    Layers,
    LayoutGrid,
    Power,
    type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { iconMap } from "@/components/datatable/iconMap";
import { useActiveModuleGroups } from "@/hooks/useSidebarMenus";
import { useLogout } from "@/hooks/useLogout";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { getHomePathByRole } from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

const PINK = "#FF8FAB";
const PINK_DEEP = "#FF6B9D";

/**
 * Primary features pinned directly on the rail, in priority order.
 * Each entry is permission-gated so every role only sees what it can
 * actually use (STUDENT/TEACHER get the full learning set, ADMIN gets
 * the moderation-visible subset + the management catalog below).
 *
 * `match` lists extra pathname prefixes that should light the button up
 * (sub-flows that live outside the feature's URL namespace).
 */
type RailItem = {
    url: string;
    label: string;
    permission?: string;
    icon?: LucideIcon;
    /** Kanji has no lucide glyph — render a display-font character instead. */
    glyph?: string;
    match?: string[];
};

const PRIMARY_NAV: RailItem[] = [
    { url: "/dictionary", label: "Từ điển", icon: BookOpen },
    {
        url: "/library",
        label: "Thư viện thẻ",
        icon: Layers,
        permission: "FOLDER_READ",
        match: ["/deck/", "/create-deck", "/decks/", "/card-templates"],
    },
    {
        url: "/kanji-study",
        label: "Học Kanji",
        glyph: "漢",
        permission: "KANJI_DECK_READ",
    },
    {
        url: "/grammar",
        label: "Ngữ pháp",
        icon: BookText,
        permission: "GRAMMAR_PROGRESS_READ",
    },
    {
        url: "/quizzes",
        label: "Kiểm tra",
        icon: ClipboardList,
        permission: "QUIZ_READ",
    },
    {
        url: "/classrooms",
        label: "Lớp học",
        icon: GraduationCap,
        permission: "CLASSROOM_READ",
    },
];

/** Vietnamese display names for the DB module-group titles. */
const GROUP_LABELS: Record<string, string> = {
    System: "Hệ thống",
    RBAC: "Phân quyền",
    Dashboard: "Tổng quan",
    Community: "Cộng đồng",
    Language: "Kho từ vựng",
    "Kanji Study": "Kho Kanji",
    Assessment: "Kiểm tra",
    Group: "Lớp học",
    Learning: "Học tập",
    "Grammar Learning": "Ngữ pháp",
};

/** One 54×54 candy nav button (active = pink gradient + glow + white icon). */
function RailButton({
    label,
    active,
    onClick,
    children,
}: {
    label: string;
    active?: boolean;
    onClick?: () => void;
    children: ReactNode;
}) {
    return (
        <TooltipWrapper content={label} side="right">
            <button
                type="button"
                aria-label={label}
                onClick={onClick}
                className={cn(
                    "flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] transition-colors cursor-pointer",
                    active ? "text-white" : "text-[#B9AEB2] hover:text-[#FF8FAB]",
                )}
                style={
                    active
                        ? {
                              background: `linear-gradient(145deg, ${PINK}, ${PINK_DEEP})`,
                              boxShadow: "0 8px 18px rgba(255,143,171,0.5)",
                          }
                        : undefined
                }
            >
                {children}
            </button>
        </TooltipWrapper>
    );
}

type CatalogModule = { url: string; title: string; icon: LucideIcon };
type CatalogGroup = { id: string; name: string; modules: CatalogModule[] };

/**
 * The "Danh mục" rail button. Hovering (or focusing) it opens a candy panel
 * listing every remaining module (not already pinned on the rail) grouped by
 * its function group — click an item to navigate. Keeps the rail tidy: one
 * button instead of a long icon stack.
 */
function CatalogFlyout({ groups }: { groups: CatalogGroup[] }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ left: number; top: number } | null>(
        null,
    );
    const btnRef = useRef<HTMLButtonElement>(null);
    const closeTimer = useRef<number | null>(null);

    const isActive = (url: string) =>
        location.pathname === url || location.pathname.startsWith(`${url}/`);
    const anyActive = groups.some((g) => g.modules.some((m) => isActive(m.url)));

    const cancelClose = () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
    // Anchor the portal panel to the button's current screen position.
    const openNow = () => {
        cancelClose();
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setCoords({ left: r.right + 10, top: r.top });
        setOpen(true);
    };
    // Small grace period so moving the cursor across the gap into the panel
    // doesn't snap it shut.
    const closeSoon = () => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => setOpen(false), 140);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                aria-label="Danh mục"
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => (open ? setOpen(false) : openNow())}
                onMouseEnter={openNow}
                onMouseLeave={closeSoon}
                onFocus={openNow}
                onBlur={closeSoon}
                onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                }}
                className={cn(
                    "flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] transition-colors cursor-pointer",
                    anyActive || open
                        ? "text-white"
                        : "text-[#B9AEB2] hover:text-[#FF8FAB]",
                )}
                style={
                    anyActive || open
                        ? {
                              background: `linear-gradient(145deg, ${PINK}, ${PINK_DEEP})`,
                              boxShadow: "0 8px 18px rgba(255,143,171,0.5)",
                          }
                        : undefined
                }
            >
                <LayoutGrid className="h-[22px] w-[22px]" />
            </button>

            {open &&
                coords &&
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            left: coords.left,
                            top: coords.top,
                            maxHeight: `calc(100vh - ${coords.top}px - 16px)`,
                        }}
                        className="z-[60] w-64 overflow-y-auto rounded-2xl border border-[#FBEAF0] bg-white p-3 shadow-[0_18px_50px_rgba(255,143,171,0.22)]"
                        onMouseEnter={openNow}
                        onMouseLeave={closeSoon}
                    >
                        <div className="px-2 pb-2">
                            <span className="font-display text-[14px] font-bold text-[#3A2E33]">
                                Danh mục
                            </span>
                        </div>
                        {groups.map((g) => (
                            <div key={g.id} className="mb-2 last:mb-0">
                                <div className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-[#FF6B9D]">
                                    {g.name}
                                </div>
                                {g.modules.map((m) => {
                                    const Icon = m.icon;
                                    const active = isActive(m.url);
                                    return (
                                        <button
                                            key={m.url}
                                            type="button"
                                            onClick={() => {
                                                navigate(m.url);
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                "flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13px] transition-colors cursor-pointer",
                                                active
                                                    ? "bg-[#FFE5EC] font-semibold text-[#FF6B9D]"
                                                    : "text-[#3A2E33] hover:bg-[#FFF0F4] hover:text-[#FF6B9D]",
                                            )}
                                        >
                                            <Icon className="h-4 w-4 shrink-0 text-[#FF8FAB]" />
                                            <span className="truncate">{m.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>,
                    document.body,
                )}
        </>
    );
}

/**
 * The Sakura candy sidebar rail — a single, permission-aware component shared
 * by every authenticated shell. Renders the inner column only; the host
 * supplies the outer width / border.
 *
 *   ┌────┐
 *   │ 🟣 │ avatar (→ profile)
 *   │ 🏠 │ Home (→ /dashboard)
 *   │ 📖 │ Từ điển           — every role
 *   │ 🗂 │ Thư viện thẻ       — FOLDER_READ
 *   │ 漢 │ Học Kanji          — KANJI_DECK_READ
 *   │ 📝 │ Ngữ pháp           — GRAMMAR_PROGRESS_READ
 *   │ ✅ │ Kiểm tra           — QUIZ_READ
 *   │ 🎓 │ Lớp học            — CLASSROOM_READ
 *   │ ▦  │ Danh mục flyout    — mọi module còn lại (đã lọc permission)
 *   │ ⏻  │ Power (logout)
 *   └────┘
 *
 * The pinned buttons cover the core learning loop; everything else (games,
 * translator, leaderboard, admin management …) lives in the "Danh mục"
 * flyout, grouped and filtered by the viewer's effective permissions.
 */
export function SakuraSidebarContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useLogout();
    const { firstName, lastName, email } = useSelector(
        (s: RootState) => s.auth,
    );
    const { activeRole, hasPermission } = usePermissions();
    const { data: moduleGroups = [] } = useActiveModuleGroups();

    const home = getHomePathByRole(activeRole);
    const isHome = location.pathname === home;
    const initial = (firstName || lastName || email || "?")
        .trim()
        .charAt(0)
        .toUpperCase();

    const visiblePrimary = PRIMARY_NAV.filter(
        (item) => !item.permission || hasPermission(item.permission),
    );

    const isItemActive = (item: RailItem) =>
        location.pathname === item.url ||
        location.pathname.startsWith(`${item.url}/`) ||
        (item.match ?? []).some((prefix) =>
            location.pathname.startsWith(prefix),
        );

    const resolveIcon = (name?: string) => {
        const key = (name && name in iconMap ? name : "menu") as keyof typeof iconMap;
        return iconMap[key];
    };

    // Everything the viewer may access that is NOT already pinned on the rail,
    // grouped by function group and tucked behind the "Danh mục" button.
    const pinnedUrls = new Set([home, "/dashboard", ...PRIMARY_NAV.map((i) => i.url)]);
    const catalogGroups: CatalogGroup[] = (() => {
        const seen = new Set<string>();
        const out: CatalogGroup[] = [];
        for (const g of moduleGroups) {
            const mods: CatalogModule[] = [];
            for (const m of g.modules ?? []) {
                const url = m.url ?? "";
                if (!url || pinnedUrls.has(url)) continue;
                if (seen.has(url)) continue;
                seen.add(url);
                mods.push({ url, title: m.title ?? url, icon: resolveIcon(m.icon) });
            }
            if (mods.length > 0) {
                const name = g.name ?? "Khác";
                out.push({
                    id: String(g.id ?? name),
                    name: GROUP_LABELS[name] ?? name,
                    modules: mods,
                });
            }
        }
        return out;
    })();

    return (
        <div className="flex h-full w-full flex-col items-center gap-[30px] pt-3 pb-6">
            {/* Avatar → profile */}
            <button
                type="button"
                onClick={() => navigate("/profile")}
                aria-label="Trang cá nhân"
                className="shrink-0 rounded-full border-2 border-[#FFC2D4] bg-[#FFF0F4] p-1 transition-transform hover:scale-105 cursor-pointer"
            >
                <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-[#FFE5EC] font-semibold text-[#FF6B9D]">
                        {initial}
                    </AvatarFallback>
                </Avatar>
            </button>

            {/* Primary nav — Home, the pinned features, then the catalog flyout */}
            <nav className="mt-1 flex w-full flex-1 flex-col items-center gap-[26px] overflow-y-auto scrollbar-hidden">
                <RailButton
                    label="Trang chủ"
                    active={isHome}
                    onClick={() => navigate(home)}
                >
                    <Home className="h-6 w-6" />
                </RailButton>

                {visiblePrimary.map((item) => (
                    <RailButton
                        key={item.url}
                        label={item.label}
                        active={isItemActive(item)}
                        onClick={() => navigate(item.url)}
                    >
                        {item.glyph ? (
                            <span className="font-display text-[22px] font-bold leading-none">
                                {item.glyph}
                            </span>
                        ) : (
                            item.icon && <item.icon className="h-[22px] w-[22px]" />
                        )}
                    </RailButton>
                ))}

                {catalogGroups.length > 0 && (
                    <CatalogFlyout groups={catalogGroups} />
                )}
            </nav>

            {/* Footer */}
            <div className="flex shrink-0 flex-col items-center">
                <RailButton label="Đăng xuất" onClick={() => void logout()}>
                    <Power className="h-[22px] w-[22px]" />
                </RailButton>
            </div>
        </div>
    );
}
