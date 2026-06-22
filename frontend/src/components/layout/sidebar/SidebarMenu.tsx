import { SakuraSidebarContent } from "@/components/sakura-dashboard/SakuraSidebar";
import { Sidebar } from "@/components/ui/sidebar";

/**
 * App sidebar for the shell (MainLayout) — the Sakura candy rail.
 *
 * The rail itself (avatar, role-aware nav, temp role switcher, logout) lives
 * in {@link SakuraSidebarContent}, shared with the dashboard's own `<aside>`
 * so the sidebar looks and behaves identically everywhere. This wrapper just
 * mounts it inside the shadcn `<Sidebar>` primitive at the fixed rail width
 * (set via `--sidebar-width` on the SidebarProvider in MainLayout).
 */
export function SidebarMenu() {
    return (
        <Sidebar collapsible="none" className="border-r border-[#FBEAF0] bg-white">
            <SakuraSidebarContent />
        </Sidebar>
    );
}
