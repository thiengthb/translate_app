import DynamicBreadcrumbs from "@/components/layout/DynamicBreadcrumbs";
import HeaderRight from "@/components/layout/HeaderRight";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface MainLayoutTopBarProps {
    /** Path → title map used by DynamicBreadcrumbs to override auto-generated labels. */
    pathName?: Record<string, string>;
    /** Opens the global keyboard shortcuts dialog (passed through to HeaderRight). */
    onOpenShortcuts?: () => void;
}

/**
 * Admin shell top bar.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ [☰]│ Breadcrumbs ──────────────────────  HeaderRight actions │
 *   └─────────────────────────────────────────────────────────────┘
 *      ↑
 *      Hamburger toggle — shown only on `md` and below (mobile / tablet),
 *      hidden on desktop where the sidebar is always visible and can be
 *      toggled via ⌘B / sidebar branding click / footer chevron.
 *
 * Responsive sizing:
 *   - height  : 56px on mobile, 64px from `sm` up
 *   - padding : 12px on mobile, 16px from `sm` up
 *   - breadcrumbs scroll horizontally if they overflow on narrow screens
 *     instead of wrapping or pushing HeaderRight off-screen.
 */
export function MainLayoutTopBar({
    pathName,
    onOpenShortcuts,
}: MainLayoutTopBarProps) {
    return (
        <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 px-3 sm:px-4 min-w-0">
            <SidebarTrigger className="md:hidden -ml-1" />
            <Separator
                orientation="vertical"
                className="md:hidden !h-5"
            />
            <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <DynamicBreadcrumbs pathTitles={pathName} />
            </div>
            <HeaderRight onOpenShortcuts={onOpenShortcuts} />
        </header>
    );
}
