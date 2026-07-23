interface MainLayoutTopBarProps {
    /** Callback ref for the `headerExtra` portal host — `<MainLayout>` (deep
     *  inside `<Outlet/>`) portals the current page's `headerExtra` into
     *  this node. See `contexts/LayoutConfigContext.tsx` for why a portal
     *  (not context state) is used for this specific prop. */
    setHeaderExtraHost: (el: HTMLDivElement | null) => void;
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
 *
 * Sizing notes:
 *   - height  : 56px (h-14) across all breakpoints. Inner controls sit at
 *               h-8 so a comfortable breathing room on either side remains.
 *   - padding : 12px / 16px / 24px horizontal (px-3 sm:px-4 lg:px-6) —
 *               matches the page content area below.
 */
export function MainLayoutTopBar({ setHeaderExtraHost }: MainLayoutTopBarProps) {
    return (
        <header className="flex h-14 shrink-0 items-center gap-2 px-3 sm:px-4 lg:px-6 min-w-0">
            <div ref={setHeaderExtraHost} className="flex items-center min-w-0" />
            <div className="flex-1" />
        </header>
    );
}
