import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KeyboardShortcutsDialog } from "@/components/common/KeyboardShortcutsDialog";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { GuestLayout } from "@/components/layout/GuestLayout";
import HeaderRight from "@/components/layout/HeaderRight";
import { MainLayoutTopBar } from "@/components/layout/MainLayoutTopBar";
import { SidebarMenu } from "@/components/layout/sidebar";

import { useKeyboardShortcutsDialog } from "@/hooks/useKeyboardShortcutsDialog";
import { useLogoutShortcut } from "@/hooks/useLogoutShortcut";
import { useAutoCheckIn } from "@/hooks/useStreak";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store/store";

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
 * App-wide layout shell.
 *
 * Renders one of two trees depending on the viewer:
 *
 *   AUTHENTICATED (any role) → <AppShell />     sidebar + top bar + scrollable main
 *   guest visitor             → <GuestLayout /> horizontal landing-style navbar
 *
 * Every authenticated user — admin, student, teacher — gets the same
 * sidebar shell. The sidebar's content is permission-aware (each module
 * carries a `requiredPermission` checked by `useActiveModuleGroups`),
 * so a student naturally sees fewer entries than an admin without
 * needing a separate layout.
 *
 * Concerns kept at this level (and only this level):
 *   - Auth gate (which shell to render)
 *   - Side-effects that run on every authenticated page mount
 *     (`useAutoCheckIn` — once-per-day streak ping)
 *   - Global keyboard-shortcut dialog state, mounted ONCE here so the
 *     dialog (and the `?` global listener inside the hook) is available
 *     regardless of which shell is active.
 *
 * Layout markup lives in the dedicated sub-components — keep this file
 * easy to skim.
 */
export function MainLayout({ children, pathName, headerExtra, parentCrumb, ignorePaths, pageDescription, breadcrumbIcon, focus, onBack, pageScroll, sidePanel }: MainLayoutProps) {
    const { isAuthenticated } = useSelector(
        (state: RootState) => state.auth,
    );

    // Side-effect: once-per-day streak check-in. Fire-and-forget; component
    // doesn't read the result. Placed here because the layout wraps every
    // authenticated page.
    useAutoCheckIn();

    // Global keyboard shortcuts mounted at the root so they work
    // regardless of which shell is active.
    //   - `?`       → open shortcuts dialog
    //   - ⌘/Ctrl+⇧+L → log out (no-op for guests)
    const shortcuts = useKeyboardShortcutsDialog();
    useLogoutShortcut();

    return (
        <>
            {isAuthenticated ? (
                focus ? (
                    <FocusShell title={pathName ? Object.values(pathName).at(-1) : undefined} onBack={onBack}>
                        {children}
                    </FocusShell>
                ) : (
                    <AppShell
                        pathName={pathName}
                        headerExtra={headerExtra}
                        parentCrumb={parentCrumb}
                        ignorePaths={ignorePaths}
                        pageDescription={pageDescription}
                        breadcrumbIcon={breadcrumbIcon}
                        pageScroll={pageScroll}
                        sidePanel={sidePanel}
                    >
                        {children}
                    </AppShell>
                )
            ) : (
                <GuestLayout>
                    {/* Mobile-first padding: tighter on small screens so the
                        navbar + content stay close to the edges where the
                        thumb naturally lands. */}
                    <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
                        {children}
                    </div>
                </GuestLayout>
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
    children,
    title,
    onBack,
}: {
    children: ReactNode;
    title?: string;
    onBack?: () => void;
}) {
    return (
        <div className="flex h-svh max-h-[calc(100svh-16px)] flex-col overflow-hidden min-w-0 max-w-full">
            <header className="flex h-12 shrink-0 items-center gap-2 px-3 sm:px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={onBack ?? (() => window.history.back())}
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
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── App shell (sidebar + main, one unified shell) ──────────────────────────
interface AppShellProps {
    children: ReactNode;
    pathName?: MainLayoutProps["pathName"];
    headerExtra?: MainLayoutProps["headerExtra"];
    parentCrumb?: MainLayoutProps["parentCrumb"];
    ignorePaths?: MainLayoutProps["ignorePaths"];
    pageDescription?: MainLayoutProps["pageDescription"];
    breadcrumbIcon?: MainLayoutProps["breadcrumbIcon"];
    pageScroll?: MainLayoutProps["pageScroll"];
    sidePanel?: MainLayoutProps["sidePanel"];
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
function AppShell({
    children,
    headerExtra,
    pageScroll,
    sidePanel,
}: AppShellProps) {
    // Shared page frame (padding, max-width, centering) — kept IDENTICAL
    // across both scroll models so the sidebar sits at the same position/size
    // on every page. Only the scroll model and sidePanel differ per page:
    //   pageScroll=true  → whole document scrolls; shell height follows content.
    //   pageScroll=false → shell fills the viewport; only <main> scrolls internally.
    return (
        <div
            className={cn(
                "bg-background p-2 sm:p-4 lg:p-8",
                pageScroll ? "min-h-screen" : "h-svh",
            )}
        >
            <div
                className={cn(
                    "mx-auto flex w-full max-w-[1600px] gap-7",
                    pageScroll ? "flex-col items-start xl:flex-row" : "h-full",
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
                            <div className="mb-6 flex min-w-0 items-center justify-between gap-2">
                                {headerExtra && (
                                    <div className="flex min-w-0 items-center">{headerExtra}</div>
                                )}
                                <div className="flex-1" />
                                <HeaderRight />
                            </div>
                            {children}
                        </main>
                    ) : (
                        <div className="bg-background relative flex h-full flex-1 flex-col overflow-hidden min-w-0 max-w-full">
                            <MainLayoutTopBar headerExtra={headerExtra} />
                            <ScrollHintContainer
                                axis="vertical"
                                className="flex-1 min-h-0 min-w-0 max-w-full"
                                viewportClassName="flex flex-col px-3 sm:px-4 lg:px-6 py-2 sm:py-3"
                            >
                                <main className="flex-1 min-h-0 flex flex-col min-w-0 max-w-full">
                                    {children}
                                </main>
                            </ScrollHintContainer>
                        </div>
                    )}
                </div>
                {pageScroll && sidePanel && (
                    <div className="w-full flex-none xl:w-[420px]">{sidePanel}</div>
                )}
            </div>
        </div>
    );
}
