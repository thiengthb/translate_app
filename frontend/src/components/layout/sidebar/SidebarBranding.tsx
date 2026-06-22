import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { HanabunMark } from "@/components/branding/HanabunLogo";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { getHomePathByRole } from "@/utils/rbac.utils";

interface SidebarBrandingProps {
    /** Full app name shown when sidebar is expanded. */
    title?: string;
}

/**
 * Sidebar header: clickable logo (→ home) + app title, with the
 * collapse / expand toggle sitting right beside it.
 *
 *   Expanded:   [Logo] Hanabun .............. [⟨]
 *   Collapsed:  [Logo]
 *               [⟩]
 *
 * Clicking the logo navigates to the role's home page (it no longer
 * toggles the sidebar — that's the dedicated chevron button's job).
 */
export function SidebarBranding({ title = "Hanabun" }: SidebarBrandingProps) {
    const { toggleSidebar, state } = useSidebar();
    const navigate = useNavigate();
    const { activeRole } = usePermissions();
    const isCollapsed = state !== "expanded";

    const goHome = () => navigate(getHomePathByRole(activeRole));

    return (
        <SidebarHeader className="py-3 px-2">
            <div
                className={cn(
                    "flex items-center gap-1.5",
                    isCollapsed ? "flex-col" : "flex-row",
                )}
            >
                {/* Logo + title → home */}
                <button
                    type="button"
                    onClick={goHome}
                    aria-label="Về trang chủ"
                    className={cn(
                        "flex items-center gap-2 rounded-md transition-colors cursor-pointer hover:bg-sidebar-accent",
                        isCollapsed ? "justify-center p-0" : "min-w-0 flex-1 p-1",
                    )}
                >
                    {/* 32×32 to match the nav items so every icon lines up on
                        the same vertical centerline when collapsed. */}
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] border border-[#FFC2D4] bg-[#FFF0F4] p-0.5 shrink-0">
                        <HanabunMark />
                    </div>
                    {!isCollapsed && (
                        <span className="font-display text-lg font-bold text-[#FF6B9D] truncate">
                            {title}
                        </span>
                    )}
                </button>

                {/* Collapse / expand toggle */}
                <TooltipWrapper
                    content={isCollapsed ? "Mở sidebar (⌘B)" : "Thu sidebar (⌘B)"}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        aria-label="Toggle sidebar"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="size-4" />
                        ) : (
                            <ChevronLeft className="size-4" />
                        )}
                    </Button>
                </TooltipWrapper>
            </div>
        </SidebarHeader>
    );
}
