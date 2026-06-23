import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Home, LayoutGrid, Power, Repeat, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iconMap } from "@/components/datatable/iconMap";
import { useRoleSwitch } from "@/contexts/RoleSwitchContext";
import { useActiveModuleGroups } from "@/hooks/useSidebarMenus";
import { useLogout } from "@/hooks/useLogout";
import { cn } from "@/lib/utils";
import {
    ADMIN_ROLE,
    formatRoleLabel,
    getHomePathByRole,
    normalizeRole,
} from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

const PINK = "#FF8FAB";
const PINK_DEEP = "#FF6B9D";

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
 * listing every module grouped by its function group — click an item to
 * navigate. Keeps the rail tidy: one button instead of a long icon stack.
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
                            </span>{" "}
                            <span className="text-[11px] text-[#9A8E92]">
                                (tạm thời chưa phân chia)
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
 * The Sakura candy sidebar rail — a single, role-aware component shared by the
 * dashboard's `<aside>` and the app shell (MainLayout). Renders the inner
 * column only; the host supplies the outer width / border.
 *
 *   ┌────┐
 *   │ 🟣 │ avatar (→ profile)
 *   │ 🏠 │ Home (active → role home)
 *   │ …  │ ADMIN only: every module from the old sidebar, as candy icons
 *   │ 🔁 │ TEMP role switcher (user / admin / teacher) — remove before ship
 *   │ ⏻  │ Power (logout)
 *   └────┘
 *
 * Non-admin roles get the minimal "basic user" rail (Home + Power). Admin gets
 * the full module nav. The temp role switcher lets you preview each role.
 */
export function SakuraSidebarContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useLogout();
    const { firstName, lastName, email, role } = useSelector(
        (s: RootState) => s.auth,
    );
    const { activeRole, availableRoles, setViewRole } = useRoleSwitch();
    const { data: moduleGroups = [] } = useActiveModuleGroups();

    const primaryRole = normalizeRole(role);
    const isAdmin = normalizeRole(activeRole) === ADMIN_ROLE;
    const home = getHomePathByRole(activeRole);
    const isHome =
        location.pathname === home || location.pathname === "/dashboard";
    const initial = (firstName || lastName || email || "?")
        .trim()
        .charAt(0)
        .toUpperCase();

    const resolveIcon = (name?: string) => {
        const key = (name && name in iconMap ? name : "menu") as keyof typeof iconMap;
        return iconMap[key];
    };

    // Admin gets the full module nav, grouped by function group and tucked
    // behind the "Danh mục" button. Other roles get the basic rail.
    const catalogGroups: CatalogGroup[] = (() => {
        if (!isAdmin) return [];
        const seen = new Set<string>();
        const out: CatalogGroup[] = [];
        for (const g of moduleGroups) {
            const mods: CatalogModule[] = [];
            for (const m of g.modules ?? []) {
                const url = m.url ?? "";
                if (!url || url === "/dashboard" || url === home) continue;
                if (seen.has(url)) continue;
                seen.add(url);
                mods.push({ url, title: m.title ?? url, icon: resolveIcon(m.icon) });
            }
            if (mods.length > 0) {
                out.push({
                    id: String(g.id ?? g.name ?? "group"),
                    name: g.name ?? "Khác",
                    modules: mods,
                });
            }
        }
        return out;
    })();

    const switchTo = (next: string) => {
        const normalized = normalizeRole(next);
        setViewRole(normalized === primaryRole ? null : normalized);
        navigate(getHomePathByRole(normalized));
    };

    return (
        <div className="flex h-full w-full flex-col items-center gap-[22px] py-7 pb-6">
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

            {/* Primary nav — Home always; admin also gets the "Danh mục" flyout */}
            <nav className="flex w-full flex-1 flex-col items-center gap-[18px]">
                <RailButton
                    label="Trang chủ"
                    active={isHome}
                    onClick={() => navigate(home)}
                >
                    <Home className="h-6 w-6" />
                </RailButton>

                {catalogGroups.length > 0 && (
                    <CatalogFlyout groups={catalogGroups} />
                )}
            </nav>

            {/* Footer */}
            <div className="flex shrink-0 flex-col items-center gap-[18px]">
                {/* TEMP: dev-only role switcher (user / admin / teacher).
                    Remove this whole block before shipping. */}
                {availableRoles.length > 1 && (
                    <DropdownMenu>
                        <TooltipWrapper content="Đổi vai trò (tạm)" side="right">
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Đổi vai trò (tạm)"
                                    className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] text-[#B9AEB2] transition-colors hover:text-[#FF8FAB] cursor-pointer"
                                >
                                    <Repeat className="h-[22px] w-[22px]" />
                                </button>
                            </DropdownMenuTrigger>
                        </TooltipWrapper>
                        <DropdownMenuContent side="right" align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Đổi chế độ xem (tạm)
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {availableRoles.map((r) => {
                                const selected =
                                    normalizeRole(r) === normalizeRole(activeRole);
                                return (
                                    <DropdownMenuItem
                                        key={r}
                                        onSelect={() => switchTo(r)}
                                        className={cn(
                                            "gap-2 text-sm cursor-pointer",
                                            selected &&
                                                "bg-primary/10 font-medium text-primary",
                                        )}
                                    >
                                        {formatRoleLabel(r)} View
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <RailButton label="Đăng xuất" onClick={() => void logout()}>
                    <Power className="h-[22px] w-[22px]" />
                </RailButton>
            </div>
        </div>
    );
}
