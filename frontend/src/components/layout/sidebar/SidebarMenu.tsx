import { Home, Power } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { Sidebar } from "@/components/ui/sidebar";
import { useLogout } from "@/hooks/useLogout";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { getHomePathByRole } from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

// Fixed sakura accent for the active nav button (mirrors the dashboard design).
const PINK = "#FF8FAB";
const PINK_DEEP = "#FF6B9D";

/**
 * One 54×54 candy nav button. Active = pink gradient + glow + white icon;
 * inactive = muted icon that tints pink on hover. Mirrors the rail buttons
 * in the Sakura dashboard design.
 */
function RailButton({
    label,
    active,
    onClick,
    children,
}: {
    label: string;
    active?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
}) {
    return (
        <TooltipWrapper content={label} side="right">
            <button
                type="button"
                aria-label={label}
                onClick={onClick}
                className={cn(
                    "flex h-[54px] w-[54px] items-center justify-center rounded-[20px] transition-colors cursor-pointer",
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
 * App sidebar — the Sakura candy icon rail.
 *
 *   ┌────┐
 *   │ 🟣 │ ← avatar (→ profile)
 *   │ 🏠 │ ← Home (active, pink gradient → role home)
 *   │    │
 *   │ ⏻  │ ← Power (logout, bottom)
 *   └────┘
 *
 * Intentionally minimal for now — the real module navigation will be added
 * back on top of this frame later. The previous resource-driven sidebar
 * components (SidebarBranding / NavGroup / SidebarSearch / …) are kept in
 * this folder, unused, for that next step.
 */
export function SidebarMenu() {
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useLogout();
    const { activeRole } = usePermissions();
    const { firstName, lastName, email } = useSelector(
        (s: RootState) => s.auth,
    );

    const home = getHomePathByRole(activeRole);
    const isHome =
        location.pathname === home || location.pathname === "/dashboard";
    const initial = (firstName || lastName || email || "?")
        .trim()
        .charAt(0)
        .toUpperCase();

    return (
        <Sidebar collapsible="none" className="border-r border-[#FBEAF0] bg-white">
            <div className="flex h-full w-full flex-col items-center gap-[30px] py-7 pb-6">
                {/* Avatar → profile */}
                <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    aria-label="Trang cá nhân"
                    className="rounded-full border-2 border-[#FFC2D4] bg-[#FFF0F4] p-1 transition-transform hover:scale-105 cursor-pointer"
                >
                    <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-[#FFE5EC] text-[#FF6B9D] font-semibold">
                            {initial}
                        </AvatarFallback>
                    </Avatar>
                </button>

                {/* Primary nav — just Home for now */}
                <nav className="mt-1 flex flex-col items-center gap-[26px]">
                    <RailButton
                        label="Trang chủ"
                        active={isHome}
                        onClick={() => navigate(home)}
                    >
                        <Home className="h-6 w-6" />
                    </RailButton>
                </nav>

                {/* Footer — logout */}
                <div className="mt-auto flex flex-col items-center gap-[26px]">
                    <RailButton label="Đăng xuất" onClick={() => void logout()}>
                        <Power className="h-[22px] w-[22px]" />
                    </RailButton>
                </div>
            </div>
        </Sidebar>
    );
}
