import DynamicBreadcrumbs from "@/components/layout/DynamicBreadcrumbs";
import HeaderRight from "@/components/layout/HeaderRight";
import { Separator } from "@/components/ui/separator";

interface MainLayoutTopBarProps {
    pathName?: Record<string, string>;
    headerExtra?: React.ReactNode;
    parentCrumb?: { href: string; title: string };
    ignorePaths?: string[];
    pageDescription?: string;
    breadcrumbIcon?: React.ReactNode;
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
 *   - height  : 56px (h-14) across all breakpoints. Inner controls sit at
 *               h-8 so a comfortable breathing room on either side remains.
 *   - padding : 12px / 16px / 24px horizontal (px-3 sm:px-4 lg:px-6) —
 *               matches the page content area below so breadcrumbs line up
 *               vertically with the content beneath them.
 *   - breadcrumbs scroll horizontally if they overflow on narrow screens
 *     instead of wrapping or pushing HeaderRight off-screen.
 */
export function MainLayoutTopBar({
    pathName,
    headerExtra,
    parentCrumb,
    ignorePaths,
    pageDescription,
    breadcrumbIcon,
}: MainLayoutTopBarProps) {
    return (
        <header className="flex h-14 shrink-0 items-center gap-2 px-3 sm:px-4 lg:px-6 min-w-0">
            <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <DynamicBreadcrumbs
                    pathTitles={pathName}
                    parentCrumb={parentCrumb}
                    ignorePaths={ignorePaths}
                    pageDescription={pageDescription}
                    leadingIcon={breadcrumbIcon}
                />
            </div>
            {headerExtra && (
                <>
                    <Separator
                        orientation="vertical"
                        className="!h-6 hidden sm:block"
                    />
                    <div className="flex items-center min-w-0">{headerExtra}</div>
                </>
            )}
            <div className="flex-1" />
            <HeaderRight />
        </header>
    );
}
