import { Button } from "@/components/ui/button";
import { SidebarHeader, useSidebar } from "@/components/ui/sidebar";

interface SidebarBrandingProps {
    /** Short text rendered inside the logo tile when collapsed. */
    logoText?: string;
    /** Full app name shown when sidebar is expanded. */
    title?: string;
}

/**
 * Sidebar header: clickable logo tile + app title. Clicking anywhere on
 * the row toggles the sidebar (gives users a big hit target instead of
 * making them aim for the ⌘B shortcut or the rail-edge handle).
 */
export function SidebarBranding({
    logoText = "RB",
    title = "RBAC System",
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
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground shrink-0">
                    {logoText}
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
