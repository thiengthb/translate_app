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
    // No right border + `relative z-10`: the rail is the same white as the
    // dashboard's leading card and sits flush against it, so the two read as
    // ONE continuous white surface. z-10 keeps the rail painting OVER the
    // card's soft shadow where it bleeds left, so no seam shows at the join.
    return (
        <Sidebar collapsible="none" className="relative z-10 bg-white">
            <SakuraSidebarContent />
        </Sidebar>
    );
}
