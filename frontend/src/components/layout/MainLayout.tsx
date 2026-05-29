import type { ReactNode } from "react";
import { useSelector } from "react-redux";

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
import { ADMIN_ROLE, normalizeRole } from "@/utils/rbac.utils";

interface MainLayoutProps {
    children: ReactNode;
    /** Path → display-title map forwarded to the breadcrumb component. */
    pathName?: Record<string, string>;
}

/**
 * App-wide layout shell.
 *
 * Renders one of two trees depending on the viewer:
 *
 *   ADMIN (authenticated)  →  <AdminShell />   sidebar + top bar + scrollable main
 *   anyone else            →  <GuestLayout />  horizontal navbar
 *
 * Concerns kept at this level (and only this level):
 *   - Auth/role gate (which shell to render)
 *   - Side-effects that should run on every authenticated page mount
 *     (`useAutoCheckIn` — once-per-day streak ping)
 *   - Global keyboard-shortcut dialog state, mounted ONCE here so the
 *     dialog (and the `?` global listener inside the hook) is available
 *     regardless of which shell is active.
 *
 * Layout markup lives in the dedicated sub-components — keep this file
 * easy to skim.
 */
export function MainLayout({ children, pathName }: MainLayoutProps) {
    const { isAuthenticated, role } = useSelector(
        (state: RootState) => state.auth,
    );

    // Side-effect: once-per-day streak check-in. Fire-and-forget; component
    // doesn't read the result. Placed here because the layout wraps every
    // authenticated page.
    useAutoCheckIn();

    // Global keyboard shortcuts mounted at the root so they work
    // regardless of which shell (admin / guest) is active.
    //   - `?`       → open shortcuts dialog
    //   - ⌘/Ctrl+⇧+L → log out (no-op for guests)
    const shortcuts = useKeyboardShortcutsDialog();
    useLogoutShortcut();

    // Sidebar shell follows the user's PRIMARY role (auth.role), NOT
    // activeRole — preview-mode role switches should change content /
    // permissions, not the chrome around the page. Otherwise an admin who
    // previewed STUDENT and refreshed would lose the sidebar.
    const isAdmin = normalizeRole(role) === ADMIN_ROLE;
    const showAdminShell = isAuthenticated && isAdmin;

    return (
        <>
            {showAdminShell ? (
                <AdminShell
                    pathName={pathName}
                    onOpenShortcuts={() => shortcuts.setOpen(true)}
                >
                    {children}
                </AdminShell>
            ) : (
                <GuestLayout onOpenShortcuts={() => shortcuts.setOpen(true)}>
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

// ─── Admin shell ────────────────────────────────────────────────────────────
interface AdminShellProps {
    children: ReactNode;
    pathName?: MainLayoutProps["pathName"];
    onOpenShortcuts: () => void;
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
 * Responsive content padding mirrors common Tailwind dashboard layouts:
 *   - mobile (default):  12px horizontal, 16px top, 24px bottom
 *   - sm  (≥ 640px):     16px horizontal, 24px top, 24px bottom
 *   - lg  (≥ 1024px):    24px horizontal — gives room for sidebar pinned
 *                        columns + wide tables without crowding
 */
function AdminShell({ children, pathName, onOpenShortcuts }: AdminShellProps) {
    return (
        <SidebarProvider>
            <SidebarMenu onOpenShortcuts={onOpenShortcuts} />
            <SidebarInset className="flex h-svh max-h-[calc(100svh-16px)] flex-col overflow-hidden min-w-0 max-w-full">
                <MainLayoutTopBar
                    pathName={pathName}
                    onOpenShortcuts={onOpenShortcuts}
                />
                <ScrollHintContainer
                    axis="vertical"
                    className="flex-1 min-h-0 min-w-0 max-w-full"
                    viewportClassName="flex flex-col px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6 pb-6"
                >
                    <main className="flex-1 flex flex-col min-w-0 max-w-full">
                        {children}
                    </main>
                </ScrollHintContainer>
            </SidebarInset>
        </SidebarProvider>
    );
}
