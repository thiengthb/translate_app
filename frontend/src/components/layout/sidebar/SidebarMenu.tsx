import { cn } from "@/lib/utils";
import { SakuraSidebarContent } from "@/components/sakura-dashboard/SakuraSidebar";

interface SidebarMenuProps {
    /** Pin the rail to the viewport instead of letting it stretch to match
     *  the row's height — needed on `pageScroll` shells (Dashboard,
     *  Dictionary), where `<main>` can grow much taller than the viewport
     *  (e.g. an expanded Tatoeba example list). Without this the aside
     *  stretches along with it and drags the logout button far below the
     *  fold. With it, the rail stays capped to the viewport height and
     *  sticks in place as the page scrolls, exactly like the fixed
     *  (non-pageScroll) shell already behaves. */
    sticky?: boolean;
}

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
export function SidebarMenu({ sticky }: SidebarMenuProps = {}) {
    return (
        <aside
            className={cn(
                "flex w-24 flex-none flex-col items-center gap-[30px] rounded-l-[36px] border-r border-[#FBEAF0] bg-white py-7 pb-6",
                sticky &&
                    "self-start sticky top-2 sm:top-4 lg:top-8 max-h-[calc(100svh-1rem)] sm:max-h-[calc(100svh-2rem)] lg:max-h-[calc(100svh-4rem)] overflow-y-auto",
            )}
        >
            <SakuraSidebarContent />
        </aside>
    );
}
