import type { ReactNode } from "react";

import { Home, Power, Repeat } from "lucide-react";
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

    // Admin sees the full module nav (deduped, minus the home/dashboard entry
    // already covered by the Home button). Other roles get the basic rail.
    const modules = (() => {
        if (!isAdmin) return [] as { url: string; title: string; icon?: string }[];
        const seen = new Set<string>();
        const out: { url: string; title: string; icon?: string }[] = [];
        for (const g of moduleGroups) {
            for (const m of g.modules ?? []) {
                const url = m.url ?? "";
                if (!url || url === "/dashboard" || url === home) continue;
                if (seen.has(url)) continue;
                seen.add(url);
                out.push({ url, title: m.title ?? url, icon: m.icon });
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

            {/* Primary nav — Home always; admin also gets every module */}
            <nav className="scrollbar-hidden flex min-h-0 w-full flex-1 flex-col items-center gap-[18px] overflow-y-auto">
                <RailButton
                    label="Trang chủ"
                    active={isHome}
                    onClick={() => navigate(home)}
                >
                    <Home className="h-6 w-6" />
                </RailButton>

                {modules.map((m) => {
                    const Icon = resolveIcon(m.icon);
                    const active =
                        location.pathname === m.url ||
                        location.pathname.startsWith(`${m.url}/`);
                    return (
                        <RailButton
                            key={m.url}
                            label={m.title}
                            active={active}
                            onClick={() => navigate(m.url)}
                        >
                            <Icon className="h-5 w-5" />
                        </RailButton>
                    );
                })}
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
