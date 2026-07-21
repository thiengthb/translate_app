interface MainLayoutTopBarProps {
    pathName?: Record<string, string>;
    headerExtra?: React.ReactNode;
    parentCrumb?: { href: string; title: string };
    ignorePaths?: string[];
    pageDescription?: string;
    breadcrumbIcon?: React.ReactNode;
}

/**
 * Admin shell top bar — **compact, uniform height** so the page area below
 * gets maximum vertical room for data.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  [headerExtra]                         HeaderRight actions   │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * The breadcrumb trail was removed (the sidebar rail already conveys the
 * active section, so it was redundant chrome); only the optional
 * page-supplied `headerExtra` and the right-aligned user actions remain.
 * The other props are kept on the interface for API compatibility with
 * callers but are no longer rendered here.
 *
 * Sizing notes:
 *   - height  : 56px (h-14) across all breakpoints. Inner controls sit at
 *               h-8 so a comfortable breathing room on either side remains.
 *   - padding : 12px / 16px / 24px horizontal (px-3 sm:px-4 lg:px-6) —
 *               matches the page content area below.
 */
export function MainLayoutTopBar({
    headerExtra,
}: MainLayoutTopBarProps) {
    return (
        <header className="flex h-14 shrink-0 items-center gap-2 px-3 sm:px-4 lg:px-6 min-w-0">
            {headerExtra && (
                <div className="flex items-center min-w-0">{headerExtra}</div>
            )}
            <div className="flex-1" />
        </header>
    );
}
