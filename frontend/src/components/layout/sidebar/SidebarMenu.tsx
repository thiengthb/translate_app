import { SakuraSidebarContent } from "@/components/sakura-dashboard/SakuraSidebar";

/**
 * App sidebar for the shell (MainLayout) — the Sakura candy rail.
 *
 * The rail itself (avatar, role-aware nav, catalog flyout, logout) lives in
 * {@link SakuraSidebarContent}. This is a plain `<aside>` — fixed 96px width,
 * flex-col, a hairline border separating it from the main content — matching
 * the reference Sakura Study Dashboard shell 1:1. It sits as a direct flex
 * sibling of `<main>` inside AppShell's single rounded white shell, so no
 * shadcn Sidebar/SidebarProvider machinery (offcanvas, mobile sheet, groups)
 * is needed here — this rail never collapses.
 */
export function SidebarMenu() {
    return (
        <aside className="flex w-24 flex-none flex-col items-center gap-[30px] border-r border-[#FBEAF0] bg-white py-7 pb-6">
            <SakuraSidebarContent />
        </aside>
    );
}
