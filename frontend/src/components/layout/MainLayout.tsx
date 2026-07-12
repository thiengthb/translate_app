import type { CSSProperties, ReactNode } from "react";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KeyboardShortcutsDialog } from "@/components/common/KeyboardShortcutsDialog";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { MainLayoutTopBar } from "@/components/layout/MainLayoutTopBar";
import { SidebarMenu } from "@/components/layout/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { useKeyboardShortcutsDialog } from "@/hooks/useKeyboardShortcutsDialog";
import { useLogoutShortcut } from "@/hooks/useLogoutShortcut";
import { useAutoCheckIn } from "@/hooks/useStreak";
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
    /** Shift the whole content block LEFT so its leading card sits flush
     *  against the sidebar's right edge (left gap → 0) WITHOUT resizing any
     *  card. The left padding isn't dropped — it's moved to the right, so the
     *  total horizontal padding (and therefore every child's width) is
     *  unchanged; the cluster just slides left and the slack lands on the
     *  right. Used by the dashboard. */
    flushLeft?: boolean;
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
export function MainLayout({ children, pathName, headerExtra, parentCrumb, ignorePaths, pageDescription, breadcrumbIcon, focus, onBack, flushLeft }: MainLayoutProps) {
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
                        flushLeft={flushLeft}
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

// ─── App shell (sidebar + top bar + main) ───────────────────────────────────
interface AppShellProps {
    children: ReactNode;
    pathName?: MainLayoutProps["pathName"];
    headerExtra?: MainLayoutProps["headerExtra"];
    parentCrumb?: MainLayoutProps["parentCrumb"];
    ignorePaths?: MainLayoutProps["ignorePaths"];
    pageDescription?: MainLayoutProps["pageDescription"];
    breadcrumbIcon?: MainLayoutProps["breadcrumbIcon"];
    flushLeft?: MainLayoutProps["flushLeft"];
}

/**
 * Sidebar + top bar + scrolling main. Self-contained so MainLayout stays
 * declarative.
 *
 * Sizing notes:
 *   - `h-svh` (small-viewport-height) avoids the mobile-keyboard jump
 *     that `100vh` triggers on iOS Safari when the soft keyboard opens.
 *   - `max-h-[calc(100svh-2px)]` is a defensive cap: shadcn's
 *     `variant="inset"` sidebar applies 1px borders that can spill into
 *     a phantom body scrollbar on certain Windows DPI scales.
 *
 * Padding is intentionally **symmetric top/bottom** so a self-contained
 * page like ProTable (toolbar + table + pagination filling `h-full`)
 * uses both edges identically and doesn't trigger ScrollHintContainer
 * with a 1–2px residual overflow. Mobile gets 12px each, desktop 24px.
 *
 * `<main>` carries `min-h-0` so its `flex-1` can shrink below the
 * intrinsic content height. Without that, a child element with
 * `h-full` (ProTable) and any sub-pixel rounding will push `<main>`
 * slightly past the viewport and force the outer scroll to engage.
 */
/**
 * Read the persisted sidebar open/closed state from the cookie set by
 * shadcn's SidebarProvider. The primitive WRITES this cookie on every
 * toggle but never reads it back on mount — so without this helper the
 * sidebar opens fresh on every page load even if the user collapsed it.
 *
 * Returns `true` (open) when the cookie is missing so first-time
 * visitors land on the expanded sidebar.
 */
function readPersistedSidebarOpen(): boolean {
    if (typeof document === "undefined") return true;
    const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sidebar_state="));
    if (!match) return true;
    return match.split("=")[1] === "true";
}

function AppShell({
    children,
    pathName,
    headerExtra,
    parentCrumb,
    ignorePaths,
    pageDescription,
    breadcrumbIcon,
    flushLeft,
}: AppShellProps) {
    return (
        // Floating-panel shell: the pink page background shows as a margin around a
        // single large rounded panel that holds BOTH the sidebar and the content.
        // The outer div owns the viewport height (`h-svh`) and paints the pink
        // margin (`bg-background` + padding); the SidebarProvider wrapper becomes
        // the rounded, clipped, shadowed panel itself.
        <div className="h-svh bg-background p-2 sm:p-3">
            <SidebarProvider
                defaultOpen={readPersistedSidebarOpen()}
                // Inline minHeight/height override the wrapper's built-in `min-h-svh`
                // (a class can't reliably beat it) so the panel fills the padded
                // frame instead of forcing a full viewport height that overflows it.
                style={{ "--sidebar-width": "96px", minHeight: 0, height: "100%" } as CSSProperties}
                // overflow-hidden + rounded clips the sidebar (left corners) and the
                // inset (right corners) into one rounded rectangle; the shadow lifts
                // the whole panel off the pink margin.
                className="h-full w-full overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(255,143,171,0.18)]"
            >
                <SidebarMenu />
                <SidebarInset className="flex h-full flex-col overflow-hidden min-w-0 max-w-full">
                <MainLayoutTopBar
                    pathName={pathName}
                    headerExtra={headerExtra}
                    parentCrumb={parentCrumb}
                    ignorePaths={ignorePaths}
                    pageDescription={pageDescription}
                    breadcrumbIcon={breadcrumbIcon}
                />
                <ScrollHintContainer
                    axis="vertical"
                    className="flex-1 min-h-0 min-w-0 max-w-full"
                    viewportClassName={
                        flushLeft
                            // Left padding moved onto the right: total horizontal
                            // padding (12/16/24 → 24/32/48 on the right) matches the
                            // symmetric case, so children keep their width and the
                            // block merely slides left, flush against the sidebar.
                            ? "flex flex-col pl-0 pr-6 sm:pr-8 lg:pr-12 py-2 sm:py-3"
                            : "flex flex-col px-3 sm:px-4 lg:px-6 py-2 sm:py-3"
                    }
                >
                    <main className="flex-1 min-h-0 flex flex-col min-w-0 max-w-full">
                        {children}
                    </main>
                </ScrollHintContainer>
            </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
