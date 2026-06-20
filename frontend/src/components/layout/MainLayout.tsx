import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KeyboardShortcutsDialog } from "@/components/common/KeyboardShortcutsDialog";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { MainLayoutTopBar } from "@/components/layout/MainLayoutTopBar";
import { SidebarMenu } from "@/components/layout/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { useColorPreset } from "@/hooks/useColorPreset";
import { useKeyboardShortcutsDialog } from "@/hooks/useKeyboardShortcutsDialog";
import { useLogoutShortcut } from "@/hooks/useLogoutShortcut";
import { useAutoCheckIn } from "@/hooks/useStreak";
import { useTypography } from "@/hooks/useTypography";
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
export function MainLayout({ children, pathName, headerExtra, parentCrumb, ignorePaths, pageDescription, breadcrumbIcon, focus, onBack }: MainLayoutProps) {
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

    // Apply the chosen color preset's CSS variables to `<html>` so the
    // palette swap from /settings takes effect immediately on every
    // page. Mounted here (not inside the settings page) so the preset
    // also applies before the user ever visits settings.
    useColorPreset();
    // Same idea for typography — `--font-sans` + `--app-font-size`.
    useTypography();

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
}: AppShellProps) {
    return (
        <SidebarProvider defaultOpen={readPersistedSidebarOpen()}>
            <SidebarMenu />
            <SidebarInset className="flex h-svh max-h-[calc(100svh-16px)] flex-col overflow-hidden min-w-0 max-w-full">
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
                    viewportClassName="flex flex-col px-3 sm:px-4 lg:px-6 py-2 sm:py-3"
                >
                    <main className="flex-1 min-h-0 flex flex-col min-w-0 max-w-full">
                        {children}
                    </main>
                </ScrollHintContainer>
            </SidebarInset>
        </SidebarProvider>
    );
}
