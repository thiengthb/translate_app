import type { ReactNode } from "react";
import { useSelector } from "react-redux";

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
    /** Path → display-title map forwarded to the breadcrumb component. */
    pathName?: Record<string, string>;
    /** Optional content rendered next to the breadcrumbs in the top bar.
     *  Pages with sub-views (e.g. `/users` Manage / Analytic tabs) inject
     *  their tab control here so it sits at chrome level instead of
     *  taking page space. */
    headerExtra?: ReactNode;
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
export function MainLayout({ children, pathName, headerExtra }: MainLayoutProps) {
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
                <AppShell
                    pathName={pathName}
                    headerExtra={headerExtra}
                >
                    {children}
                </AppShell>
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

// ─── App shell (sidebar + top bar + main) ───────────────────────────────────
interface AppShellProps {
    children: ReactNode;
    pathName?: MainLayoutProps["pathName"];
    headerExtra?: MainLayoutProps["headerExtra"];
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
}: AppShellProps) {
    return (
        <SidebarProvider defaultOpen={readPersistedSidebarOpen()}>
            <SidebarMenu />
            <SidebarInset className="flex h-svh max-h-[calc(100svh-16px)] flex-col overflow-hidden min-w-0 max-w-full">
                <MainLayoutTopBar
                    pathName={pathName}
                    headerExtra={headerExtra}
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
