import DynamicBreadcrumbs from "@/components/layout/DynamicBreadcrumbs";
import HeaderRight from "@/components/layout/HeaderRight";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface MainLayoutTopBarProps {
    /** Path → title map used by DynamicBreadcrumbs to override auto-generated labels. */
    pathName?: Record<string, string>;
    /** Optional content rendered to the right of the breadcrumb — used by
     *  pages that need tabs / segmented controls / quick filters at the
     *  chrome level (e.g. `/users` has Manage / Analytic tabs here). */
    headerExtra?: React.ReactNode;
}

/**
 * Admin shell top bar — **compact, uniform 48px height** so the page
 * area below gets maximum vertical room for data.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ [☰]│ Breadcrumbs   │  [headerExtra]      HeaderRight actions │
 *   └─────────────────────────────────────────────────────────────┘
 *      ↑
 *      Hamburger toggle — shown only on `md` and below (mobile / tablet),
 *      hidden on desktop where the sidebar is always visible and can be
 *      toggled via ⌘B / sidebar branding click / footer chevron.
 *
 * Sizing notes:
 *   - height  : 48px (h-12) across all breakpoints — was 56/64.
 *               Inner controls are h-7..h-8 so an 8px breathing room
 *               on either side remains comfortable.
 *   - padding : 12px / 16px horizontal — keeps content off the edge.
 *   - breadcrumbs scroll horizontally if they overflow on narrow screens
 *     instead of wrapping or pushing HeaderRight off-screen.
 */
export function MainLayoutTopBar({
    pathName,
    headerExtra,
}: MainLayoutTopBarProps) {
    return (
        <header className="flex h-12 shrink-0 items-center gap-1.5 px-3 sm:px-4 min-w-0">
            <SidebarTrigger className="md:hidden -ml-1" />
            <Separator
                orientation="vertical"
                className="md:hidden !h-5"
            />
            {/* Breadcrumbs shrink first to give `headerExtra` (tabs etc.)
                room. The scrollable overflow keeps long crumb trails from
                pushing actions off the right edge. */}
            <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <DynamicBreadcrumbs pathTitles={pathName} />
            </div>
            {headerExtra && (
                <>
                    <Separator
                        orientation="vertical"
                        className="!h-5 hidden sm:block"
                    />
                    <div className="flex items-center min-w-0">{headerExtra}</div>
                </>
            )}
            <div className="flex-1" />
            <HeaderRight />
        </header>
    );
}
