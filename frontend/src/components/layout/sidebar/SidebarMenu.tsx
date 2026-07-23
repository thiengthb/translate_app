import { cn } from "@/lib/utils";
import { SakuraSidebarContent } from "@/components/sakura-dashboard/SakuraSidebar";

interface SidebarMenuProps {
    /** Pin the RAIL CONTENT to the viewport instead of letting it stretch to
     *  match the row's height — needed on `pageScroll` shells (Dashboard,
     *  Dictionary, ...), where `<main>` can grow much taller than the
     *  viewport (e.g. an expanded Tatoeba example list). Only the inner
     *  content wrapper gets this treatment — the `<aside>` itself always
     *  stretches to the row's full height so its rounded corner/border/bg
     *  keep matching `<main>`'s bottom edge instead of visibly stopping
     *  wherever the rail's own (short) content ends. */
    sticky?: boolean;
}

/**
 * App sidebar for the shell (MainLayout) — the Sakura candy rail.
 *
 * The rail itself (avatar, role-aware nav, catalog flyout, logout) lives in
 * {@link SakuraSidebarContent}. The outer `<aside>` — fixed 96px width,
 * rounded-left card, hairline border — always stretches to match `<main>`'s
 * height (default flex `align-items: stretch`, matching the reference Sakura
 * Study Dashboard shell 1:1). The inner content div is what optionally gets
 * pinned via `sticky` — decoupling "how tall the card looks" from "where the
 * icons sit while you scroll" so the two never fight each other.
 */
export function SidebarMenu({ sticky }: SidebarMenuProps = {}) {
    return (
        <aside className="flex w-24 flex-none flex-col rounded-l-[36px] border-r border-[#FBEAF0] bg-white">
            <div
                className={cn(
                    "flex h-full w-full flex-col items-center gap-[30px] py-7 pb-6",
                    sticky &&
                        "sticky top-2 sm:top-4 lg:top-8 max-h-[calc(100svh-1rem)] sm:max-h-[calc(100svh-2rem)] lg:max-h-[calc(100svh-4rem)] overflow-y-auto",
                )}
            >
                <SakuraSidebarContent />
            </div>
        </aside>
    );
}
