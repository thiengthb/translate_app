import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import {
    BookOpen,
    BookText,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    GraduationCap,
    Home,
    Layers,
    LayoutGrid,
    LogIn,
    LogOut,
    Puzzle,
    Trophy,
    User as UserIcon,
    UserPlus,
    type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleSwitcher } from "@/components/layout/header/RoleSwitcher";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { iconMap } from "@/components/datatable/iconMap";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useRoleSwitch } from "@/contexts/RoleSwitchContext";
import { useActiveModuleGroups } from "@/hooks/useSidebarMenus";
import { useLogout } from "@/hooks/useLogout";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { getHomePathByRole } from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

const PINK = "#FF8FAB";
const PINK_DEEP = "#FF6B9D";

/** Rail buttons are paginated instead of scrolled/expanded — this many per
 *  page, so the nav area's height stays fixed regardless of how many items
 *  the viewer's permissions unlock. */
const RAIL_PAGE_SIZE = 6;
const RAIL_BUTTON_HEIGHT = 54;
const RAIL_GAP = 26;
/** Height of exactly `RAIL_PAGE_SIZE` buttons + the gaps between them —
 *  keeps the nav area from growing/shrinking when switching pages. */
const RAIL_PAGE_HEIGHT =
    RAIL_PAGE_SIZE * RAIL_BUTTON_HEIGHT + (RAIL_PAGE_SIZE - 1) * RAIL_GAP;

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
    // ── Page 1 — daily core: the loop every learner touches every session ──
    { url: "/dictionary", label: "Từ điển", icon: BookOpen },
    {
        url: "/kanji-study",
        label: "Học Kanji",
        glyph: "漢",
        permission: "KANJI_DECK_READ",
    },
    { url: "/kanji-radical", label: "Ghép bộ thủ", icon: Puzzle },
    { url: "/leaderboard", label: "Bảng xếp hạng", icon: Trophy },
    // ── Page 2 — extended tools; admin-only items live in the catalog ──────
    {
        url: "/library",
        label: "Thư viện thẻ",
        icon: Layers,
        permission: "FOLDER_READ",
        match: ["/deck/", "/create-deck", "/decks/", "/card-templates"],
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

/**
 * Guest rail — only genuinely public (guest-accessible) destinations, so a
 * logged-out visitor never taps a button that would drop them onto an in-shell
 * login gate. Mirrors the `guestAccessible` routes in component-registry.ts.
 */
const GUEST_NAV: RailItem[] = [
    { url: "/dictionary", label: "Từ điển", icon: BookOpen },
    { url: "/vocabulary", label: "Kho từ vựng", icon: Layers },
    { url: "/kanji-study/search", label: "Tra Kanji", glyph: "漢" },
    { url: "/kanji-radical", label: "Ghép bộ thủ", icon: Puzzle },
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
                    "flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95",
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
                    "flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95",
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

            {coords &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                key="catalog-panel"
                                initial={{ opacity: 0, x: -15, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -15, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                style={{
                                    position: "fixed",
                                    left: coords.left,
                                    top: coords.top,
                                    maxHeight: `calc(100vh - ${coords.top}px - 16px)`,
                                }}
                                className="z-[60] w-[380px] overflow-y-auto rounded-3xl border border-pink-100 bg-white/90 p-5 shadow-2xl backdrop-blur-xl"
                                onMouseEnter={openNow}
                                onMouseLeave={closeSoon}
                            >
                                <div className="px-1 pb-3">
                                    <span className="font-display text-[15px] font-bold text-[#3A2E33]">
                                        Danh mục
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {groups.map((g) => (
                                        <div key={g.id}>
                                            <div className="mb-2 inline-flex items-center rounded-full bg-[#FFE5EC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#FF6B9D]">
                                                {g.name}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {g.modules.map((m) => {
                                                    const Icon = m.icon;
                                                    const active = isActive(m.url);
                                                    return (
                                                        <motion.button
                                                            key={m.url}
                                                            type="button"
                                                            whileHover={{ scale: 1.04 }}
                                                            whileTap={{ scale: 0.97 }}
                                                            transition={{
                                                                type: "spring",
                                                                stiffness: 400,
                                                                damping: 22,
                                                            }}
                                                            onClick={() => {
                                                                navigate(m.url);
                                                                setOpen(false);
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-all cursor-pointer",
                                                                active
                                                                    ? "bg-[#FFE5EC] font-semibold text-[#FF6B9D]"
                                                                    : "text-[#3A2E33] hover:bg-pink-50 hover:text-pink-600",
                                                            )}
                                                        >
                                                            <Icon className="h-4 w-4 shrink-0 text-[#FF8FAB]" />
                                                            <span className="truncate">{m.title}</span>
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
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
 * Rail buttons paginate 5-per-page instead of scrolling — page 1 is the
 * daily core loop, page 2+ is extended/admin tooling plus the catalog:
 *
 *   Page 1 (daily core)        Page 2+ (extended & admin)
 *   ┌────┐                     ┌────┐
 *   │ 🟣 │ avatar → dropdown   │ 🗂 │ Thư viện thẻ    — FOLDER_READ
 *   │ 🏠 │ Home                │ 📝 │ Ngữ pháp        — GRAMMAR_PROGRESS_READ
 *   │ 📖 │ Từ điển             │ ✅ │ Kiểm tra        — QUIZ_READ
 *   │ 漢 │ Học Kanji           │ 🎓 │ Lớp học         — CLASSROOM_READ
 *   │ 🧩 │ Ghép bộ thủ         │ ▦  │ Danh mục flyout — mọi module còn lại
 *   │ 🏆 │ Bảng xếp hạng       └────┘   (Câu hỏi, Thẻ câu hỏi, Bộ đọc Kanji,
 *   └────┘                             quản trị hệ thống … theo permission)
 *
 * Everything not pinned on the rail (games, translator, admin management …)
 * lives in the "Danh mục" flyout, grouped by function and filtered by the
 * viewer's effective permissions.
 */
export function SakuraSidebarContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useLogout();
    const { firstName, lastName, email, role, roles, isAuthenticated } = useSelector(
        (s: RootState) => s.auth,
    );
    const { activeRole, hasPermission } = usePermissions();
    const { data: moduleGroups = [] } = useActiveModuleGroups();
    const { isPreviewMode } = useRoleSwitch();
    const { openLogin, openRegister } = useAuthModal();
    const [page, setPage] = useState(0);
    const [pageVisible, setPageVisible] = useState(true);

    const home = getHomePathByRole(activeRole);
    const isHome = location.pathname === home;
    const initial = (firstName || lastName || email || "?")
        .trim()
        .charAt(0)
        .toUpperCase();

    // Guests get a fixed public rail (GUEST_NAV); authenticated users get the
    // permission-filtered feature set.
    const navItems = isAuthenticated
        ? PRIMARY_NAV.filter((item) => !item.permission || hasPermission(item.permission))
        : GUEST_NAV;

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

    // Every rail button — Home, the pinned features, the catalog flyout, and
    // (for multi-role viewers) the role switcher — flattened into one array
    // and paginated, instead of scrolling or expanding. Each entry renders
    // itself, so mixed widgets (plain nav buttons vs. the catalog flyout vs.
    // the role-switcher dropdown) all slot in the same page uniformly.
    const railItems: { key: string; node: ReactNode }[] = [
        {
            key: "home",
            node: (
                <RailButton
                    label="Trang chủ"
                    active={isHome}
                    onClick={() => navigate(home)}
                >
                    <Home className="h-6 w-6" />
                </RailButton>
            ),
        },
        ...navItems.map((item) => ({
            key: item.url,
            node: (
                <RailButton
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
            ),
        })),
        // Catalog flyout + role switcher are authed-only concerns.
        ...(isAuthenticated && catalogGroups.length > 0
            ? [{ key: "catalog", node: <CatalogFlyout groups={catalogGroups} /> }]
            : []),
        ...(isAuthenticated && roles && roles.length > 1
            ? [
                  {
                      key: "role",
                      node: (
                          <div className="flex h-[54px] w-full flex-col items-center justify-center gap-1">
                              <RoleSwitcher primaryRole={role} roles={roles} />
                              {isPreviewMode && (
                                  <Badge
                                      variant="secondary"
                                      className="text-[9px] uppercase tracking-wide"
                                  >
                                      Xem trước
                                  </Badge>
                              )}
                          </div>
                      ),
                  },
              ]
            : []),
    ];

    const totalPages = Math.max(
        1,
        Math.ceil(railItems.length / RAIL_PAGE_SIZE),
    );
    const currentPage = Math.min(page, totalPages - 1);
    const pageItems = railItems.slice(
        currentPage * RAIL_PAGE_SIZE,
        currentPage * RAIL_PAGE_SIZE + RAIL_PAGE_SIZE,
    );

    // Fade the page out, swap its contents, then fade back in — avoids the
    // icon list flashing/jumping straight to the new set.
    const goToPage = (next: number) => {
        if (next === currentPage) return;
        setPageVisible(false);
        window.setTimeout(() => {
            setPage(next);
            setPageVisible(true);
        }, 150);
    };

    return (
        <>
            {isAuthenticated ? (
                /* Avatar → dropdown (Tài khoản / Đăng xuất) */
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label="Menu người dùng"
                            className="shrink-0 rounded-full border-2 border-[#FFC2D4] bg-[#FFF0F4] p-1 transition-transform hover:scale-105 cursor-pointer"
                        >
                            <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-[#FFE5EC] font-semibold text-[#FF6B9D]">
                                    {initial}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-44">
                        <DropdownMenuItem
                            onSelect={() => navigate("/profile")}
                            className="gap-2 cursor-pointer"
                        >
                            <UserIcon className="h-4 w-4" />
                            Tài khoản
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => void logout()}
                            className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-500/10"
                        >
                            <LogOut className="h-4 w-4" />
                            Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                /* Guest → Đăng nhập / Đăng ký, paired side by side right where
                   the avatar sits once logged in. Solid-primary + outline-
                   secondary icon-button pair (lightswind style); both open the
                   auth modal in place — never navigate the guest away. */
                <div className="flex shrink-0 items-center gap-1.5">
                    <TooltipWrapper content="Đăng nhập" side="right">
                        <button
                            type="button"
                            aria-label="Đăng nhập"
                            onClick={() => openLogin()}
                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl text-white transition-transform hover:scale-105 active:scale-95"
                            style={{
                                background: `linear-gradient(145deg, ${PINK}, ${PINK_DEEP})`,
                                boxShadow: "0 6px 14px rgba(255,143,171,0.45)",
                            }}
                        >
                            <LogIn className="h-[18px] w-[18px]" />
                        </button>
                    </TooltipWrapper>
                    <TooltipWrapper content="Đăng ký miễn phí" side="right">
                        <button
                            type="button"
                            aria-label="Đăng ký"
                            onClick={() => openRegister()}
                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-[#FFC2D4] text-[#FF6B9D] transition-transform hover:scale-105 hover:bg-[#FFF0F4] active:scale-95 dark:border-[#5a3648] dark:text-[#ff8fab] dark:hover:bg-[#2c2029]"
                        >
                            <UserPlus className="h-[18px] w-[18px]" />
                        </button>
                    </TooltipWrapper>
                </div>
            )}

            {/* Primary nav — fixed-height page of up to RAIL_PAGE_SIZE rail
                buttons; pagination controls in the footer switch pages. */}
            <nav
                className="mt-1 flex w-full flex-none flex-col items-center justify-start"
                style={{ height: RAIL_PAGE_HEIGHT }}
            >
                <div
                    className={cn(
                        "flex w-full flex-col items-center gap-[26px] transition-opacity duration-150",
                        pageVisible ? "opacity-100" : "opacity-0",
                    )}
                >
                    {pageItems.map((item) => (
                        <div key={item.key} className="shrink-0">
                            {item.node}
                        </div>
                    ))}
                </div>
            </nav>

            {/* Footer — pagination controls only (only when the rail
                overflows a single page). Logout now lives in the avatar
                dropdown up top; freeing this slot lets the nav page fit
                more buttons before it needs to paginate. */}
            <div className="flex w-full shrink-0 flex-col items-center gap-2">
                {totalPages > 1 && (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            aria-label="Trang trước"
                            disabled={currentPage === 0}
                            onClick={() => goToPage(currentPage - 1)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#B9AEB2] transition-colors hover:text-[#FF8FAB] disabled:opacity-30 disabled:hover:text-[#B9AEB2] cursor-pointer disabled:cursor-not-allowed"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>

                        <div className="flex flex-wrap items-center justify-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    aria-label={`Trang ${i + 1}`}
                                    aria-current={i === currentPage}
                                    onClick={() => goToPage(i)}
                                    className={cn(
                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors cursor-pointer",
                                        i === currentPage
                                            ? "bg-[#FF8FAB] text-white"
                                            : "text-[#B9AEB2] hover:text-[#FF8FAB]",
                                    )}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            aria-label="Trang sau"
                            disabled={currentPage === totalPages - 1}
                            onClick={() => goToPage(currentPage + 1)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#B9AEB2] transition-colors hover:text-[#FF8FAB] disabled:opacity-30 disabled:hover:text-[#B9AEB2] cursor-pointer disabled:cursor-not-allowed"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
