import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Outlet } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KeyboardShortcutsDialog } from "@/components/common/KeyboardShortcutsDialog";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { MainLayoutTopBar } from "@/components/layout/MainLayoutTopBar";
import { SidebarMenu } from "@/components/layout/sidebar";
import { WritingQuoteHeader } from "@/components/layout/WritingQuoteHeader";

import {
    useLayoutHosts,
    useLayoutStructural,
    useOnBackRefValue,
    useRegisterOnBack,
    useRegisterStructuralConfig,
} from "@/contexts/LayoutConfigContext";
import { useKeyboardShortcutsDialog } from "@/hooks/useKeyboardShortcutsDialog";
import { useLogoutShortcut } from "@/hooks/useLogoutShortcut";
import { useAutoCheckIn } from "@/hooks/useStreak";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
    children: ReactNode;
    pathName?: Record<string, string>;
    headerExtra?: ReactNode;
    /** Explicit parent crumb shown between Home and URL segments.
     *  Use on sub-pages (e.g. deck study/preview) whose URL doesn't
     *  contain the parent route (/library, /community). */
    parentCrumb?: { href: string; title: string };
    ignorePaths?: string[];
    /** Override the ⓘ tooltip on the last breadcrumb segment. */
    pageDescription?: string;
    /** Custom icon shown to the left of the last breadcrumb title. */
    breadcrumbIcon?: ReactNode;
    /** Distraction-free mode: hide the sidebar + top bar, keep only a back button,
     *  and center the content. Use for focused flows like an active learning session. */
    focus?: boolean;
    /** Back handler for focus mode (falls back to browser history). */
    onBack?: () => void;
    /** The whole page scrolls as one document (matches the reference Sakura
     *  Study Dashboard shell) instead of the default fixed-viewport frame with
     *  internal scroll. Only use on pages with no ProTable/data-table content —
     *  those size themselves to `h-full` and need the fixed frame to fit the
     *  viewport. Used by the dashboard. */
    pageScroll?: boolean;
    /** Only meaningful with `pageScroll`: extra content rendered as a second
     *  column OUTSIDE the sidebar+main shell, floating directly on the page
     *  background — matches the reference's right-hand panel (Record
     *  calendar / Achievement / Data), which is its own set of floating white
     *  cards, not part of the shell. */
    sidePanel?: ReactNode;
}

/**
 * Per-page layout shim.
 *
 * The actual sidebar/header shell is `PersistentAppShell` below, mounted
 * ONCE via a layout `<Route>` in App.tsx (outside every page's `<Outlet/>`
 * subtree) — so it survives navigation instead of being torn down and
 * rebuilt on every route change (which used to reset `WritingQuoteHeader`'s
 * rotating-quote timer on every nav, since each page previously instantiated
 * its own `<MainLayout>`, and `<Routes>` unmounts a route's whole subtree on
 * navigation).
 *
 * Every page still calls `<MainLayout {...options}>{children}</MainLayout>`
 * exactly as before — this component forwards `options` into
 * `LayoutConfigContext` (see that file for why structural flags and content
 * slots are synced differently) and renders `children` directly.
 */
export function MainLayout({
    children,
    pathName,
    headerExtra,
    focus,
    onBack,
    pageScroll,
    sidePanel,
}: MainLayoutProps) {
    const focusTitle = pathName ? Object.values(pathName).at(-1) : undefined;
    useRegisterStructuralConfig({ focus, focusTitle, pageScroll, hasSidePanel: !!sidePanel });
    useRegisterOnBack(onBack);
    const { headerExtraHost, sidePanelHost } = useLayoutHosts();

    return (
        <>
            {headerExtra && headerExtraHost && createPortal(headerExtra, headerExtraHost)}
            {pageScroll && sidePanel && sidePanelHost && createPortal(sidePanel, sidePanelHost)}
            {children}
        </>
    );
}

/**
 * The persistent app shell — sidebar + top header + scroll container, or the
 * distraction-free FocusShell. Mounted once by a layout `<Route>` (see
 * App.tsx); `<Outlet/>` renders whichever page matched the URL.
 *
 * Rendered for BOTH guests and authenticated users (Mazii open access) — the
 * sidebar itself adapts to auth state. Concerns kept at this level (and only
 * this level):
 *   - Choosing focus vs. full shell
 *   - Side-effects that used to (incorrectly) re-run on every navigation
 *     because each page re-instantiated `<MainLayout>`: `useAutoCheckIn`
 *     (once-per-day streak ping), the keyboard-shortcuts dialog, and
 *     `WritingQuoteHeader`'s rotation timer — all now genuinely mount once.
 */
export function PersistentAppShell() {
    useAutoCheckIn();
    const shortcuts = useKeyboardShortcutsDialog();
    useLogoutShortcut();

    const { focus, focusTitle, pageScroll, hasSidePanel } = useLayoutStructural();
    const onBackRef = useOnBackRefValue();

    // ONE shell for everyone (Mazii open access). Guests get the same sidebar +
    // header shell as authenticated users — the sidebar itself adapts to auth
    // state (login/register pill vs. avatar + logout). Guest-only concerns that
    // used to force the bare GuestLayout are gone; `useAutoCheckIn` and the
    // sidebar's authed queries already no-op for guests.
    return (
        <>
            {focus ? (
                <FocusShell title={focusTitle} onBackRef={onBackRef} />
            ) : (
                <AppShell pageScroll={pageScroll} hasSidePanel={hasSidePanel} />
            )}

            <KeyboardShortcutsDialog
                open={shortcuts.open}
                onOpenChange={shortcuts.setOpen}
            />
        </>
    );
}

// ─── Focus shell (distraction-free: back button + centered content) ──────────
function FocusShell({
    title,
    onBackRef,
}: {
    title?: string;
    onBackRef: ReturnType<typeof useOnBackRefValue>;
}) {
    return (
        <div className="flex h-svh max-h-[calc(100svh-16px)] flex-col overflow-hidden min-w-0 max-w-full">
            <header className="flex h-12 shrink-0 items-center gap-2 px-3 sm:px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => (onBackRef.current ?? (() => window.history.back()))()}
                    aria-label="Quay về"
                >
                    <ArrowLeft size={18} />
                </Button>
                {title && (
                    <span className="text-sm font-medium text-muted-foreground truncate">
                        {title}
                    </span>
                )}
            </header>
            {/* min-h-full keeps content vertically centered when it fits, and scrolls
                without clipping the top when it doesn't. */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="min-h-full flex flex-col items-center justify-center px-4 py-6">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

// ─── App shell (sidebar + main, one unified shell) ──────────────────────────
interface AppShellProps {
    pageScroll?: boolean;
    hasSidePanel?: boolean;
}

/**
 * Sidebar + main, both flex children of ONE rounded white shell — matches the
 * reference Sakura Study Dashboard shell 1:1 (`rounded-[36px]`, single
 * shadow, sidebar separated by a hairline border instead of its own nested
 * card). Self-contained so MainLayout stays declarative.
 *
 * Two scroll models, chosen per page via `pageScroll`:
 *
 *   pageScroll=true  (Dashboard only) — the shell grows with its content and
 *     the whole page scrolls as one document, exactly like the reference
 *     mockup. The header row (`headerExtra` + `HeaderRight`) is the first
 *     child inside `<main>`, not pinned — it scrolls away with the rest of
 *     the page. `sidePanel` (if given) renders as a SEPARATE sibling column
 *     next to the shell, floating on the page background rather than inside
 *     it — the reference's Record/Achievement/Data column is its own set of
 *     floating white cards, not part of the shell, so a taller side panel
 *     never stretches the shell and leaves dead white space behind it.
 *
 *   pageScroll=false (default, every other page) — the shell fills the
 *     viewport (`h-svh`) and only `<main>` scrolls internally, via
 *     `ScrollHintContainer`. Required by ProTable pages, which size their
 *     table + pagination to fill `h-full`. The header row (`MainLayoutTopBar`)
 *     stays outside that internal scroll region so notifications/avatar
 *     remain reachable while a long list scrolls.
 */
function AppShell({ pageScroll, hasSidePanel }: AppShellProps) {
    const { setHeaderExtraHost, setSidePanelHost } = useLayoutHosts();

    // Shared page frame (padding, max-width, centering) — kept IDENTICAL
    // across both scroll models so the sidebar sits at the same position/size
    // on every page. Only the scroll model and sidePanel differ per page:
    //   pageScroll=true  → whole document scrolls; shell height follows content.
    //   pageScroll=false → shell fills the viewport; only <main> scrolls internally.
    return (
        <div
            className={cn(
                "bg-background px-2 pb-2 sm:px-4 sm:pb-4 lg:px-8 lg:pb-8",
                pageScroll ? "min-h-screen" : "h-svh",
            )}
        >
            <div
                className={cn(
                    "mx-auto flex w-full max-w-[1600px] flex-col",
                    !pageScroll && "h-full",
                )}
            >
                {/* Top brand header — its own full-width row above the
                    sidebar+main cluster, spanning the same max-width
                    container so its edges line up with the shell below. */}
                <div className="flex h-14 w-full shrink-0 items-center sm:h-16 lg:h-[90px]">
                    <img
                        src="/hanabun-logo-full.png"
                        alt="Hanabun"
                        draggable={false}
                        className="h-full w-auto shrink-0 select-none object-contain object-left py-[5px]"
                    />
                    <WritingQuoteHeader />
                </div>

                <div
                    className={cn(
                        "flex w-full gap-7 mt-[15px]",
                        pageScroll
                            ? "flex-col items-start xl:flex-row"
                            : "min-h-0 flex-1",
                    )}
                >
                    <div
                        className={cn(
                            "flex min-w-0 flex-1 rounded-[36px] bg-white shadow-[0_18px_50px_rgba(255,143,171,0.16)]",
                            !pageScroll && "h-full overflow-hidden",
                        )}
                    >
                        <SidebarMenu sticky={pageScroll} />
                        {pageScroll ? (
                            <main className="min-w-0 flex-1 px-6 pb-10 pt-7 sm:px-9 lg:px-10 lg:pt-[34px]">
                                <Outlet />
                            </main>
                        ) : (
                            <div className="bg-background relative flex h-full flex-1 flex-col overflow-hidden min-w-0 max-w-full">
                                <MainLayoutTopBar setHeaderExtraHost={setHeaderExtraHost} />
                                <ScrollHintContainer
                                    axis="vertical"
                                    className="flex-1 min-h-0 min-w-0 max-w-full"
                                    viewportClassName="flex flex-col px-3 sm:px-4 lg:px-6 py-2 sm:py-3"
                                >
                                    <main className="flex-1 min-h-0 flex flex-col min-w-0 max-w-full">
                                        <Outlet />
                                    </main>
                                </ScrollHintContainer>
                            </div>
                        )}
                    </div>
                    {pageScroll && hasSidePanel && (
                        <div
                            ref={setSidePanelHost}
                            className="w-full flex-none xl:w-[420px]"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
