import { Box } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarHeader, useSidebar } from "@/components/ui/sidebar";

interface SidebarBrandingProps {
    /** Full app name shown when sidebar is expanded. */
    title?: string;
}

/**
 * Sidebar header: clickable logo tile + app title.
 *
 * Logo tile mirrors the admin "change role" pill style — soft
 * `bg-primary/10` fill, primary-tinted border, primary text. Sits as a
 * neat box that visually pairs with the role switcher in the top bar
 * without overpowering it.
 *
 * Clicking the whole row toggles the sidebar (big hit target — no need
 * to aim for the ⌘B shortcut or the rail-edge handle).
 */
export function SidebarBranding({
    title = "GENGO",
}: SidebarBrandingProps) {
    const { toggleSidebar, state } = useSidebar();

    return (
        <SidebarHeader className="py-3 px-0">
            <Button
                type="button"
                variant="ghost"
                onClick={toggleSidebar}
                className="
                    flex h-auto w-full min-w-0 items-center justify-start gap-3
                    group-data-[collapsible=icon]:justify-center
                    group-data-[collapsible=icon]:px-0
                "
            >
                {/* 32×32 to match the 32px nav items + footer buttons —
                    when the sidebar is collapsed every icon lines up
                    along the same vertical centerline. */}
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/10 text-primary shrink-0 transition-colors hover:bg-primary/15">
                    <Box className="h-4 w-4" />
                </div>
                {state === "expanded" && (
                    <span className="text-lg font-bold text-primary truncate">
                        {title}
                    </span>
                )}
            </Button>
        </SidebarHeader>
    );
}
