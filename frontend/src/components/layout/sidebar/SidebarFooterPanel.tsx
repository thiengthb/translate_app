import { ChevronLeft, ChevronRight } from "lucide-react";

import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { UserDropdownMenu } from "@/components/layout/UserDropdownMenu";

interface SidebarFooterPanelProps {
    /** Forwarded into the avatar dropdown so its "Phím tắt" entry
     *  opens the SAME dialog instance the header uses. Passed down
     *  from MainLayout → SidebarMenu → here. */
    onOpenShortcuts?: () => void;
}

/**
 * Sidebar footer.
 *
 *   Expanded:
 *     [Avatar + Name + Email ▾]                       [⟨]
 *      ↑ dropdown opens upward (side="top")           ↑ collapse button
 *
 *   Collapsed:
 *     [Avatar ▾]
 *      └─ side="right" so the menu doesn't get clipped
 *     [⟩]
 *
 * All the "settings"-like actions (language, theme, shortcuts, profile,
 * logout) live inside the avatar dropdown — same `UserDropdownMenu`
 * used by the header. The sidebar footer's only sidebar-specific
 * control is the collapse button.
 */
export function SidebarFooterPanel({ onOpenShortcuts }: SidebarFooterPanelProps = {}) {
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state !== "expanded";

    return (
        <SidebarFooter
            className={
                isCollapsed
                    ? "p-2 flex flex-col items-center gap-1.5"
                    : "p-2 flex flex-row items-center gap-1"
            }
        >
            <UserDropdownMenu
                variant={isCollapsed ? "compact" : "full"}
                side={isCollapsed ? "right" : "top"}
                onOpenShortcuts={onOpenShortcuts}
            />

            <TooltipWrapper
                content={isCollapsed ? "Mở sidebar (⌘B)" : "Thu sidebar (⌘B)"}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle sidebar"
                >
                    {isCollapsed ? (
                        <ChevronRight className="size-4" />
                    ) : (
                        <ChevronLeft className="size-4" />
                    )}
                </Button>
            </TooltipWrapper>
        </SidebarFooter>
    );
}
