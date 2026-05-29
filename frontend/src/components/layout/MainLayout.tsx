import { useSelector } from "react-redux";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import HeaderRight from "@/components/layout/HeaderRight";
import { SidebarMenu } from "@/components/layout/Sidebar.tsx";
import DynamicBreadcrumbs from "@/components/layout/DynamicBreadcrumbs.tsx";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { ADMIN_ROLE, normalizeRole } from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

export function MainLayout({
    children,
    pathName,
}: {
    children: React.ReactNode;
    pathName?: Record<string, string>;
}) {
    const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);
    // Layout follows the user's PRIMARY role (auth.role), not activeRole.
    // Preview-mode role switches should change content/permissions, not the
    // chrome around the page — otherwise an admin who previewed STUDENT and
    // then refreshed would lose the sidebar.
    const isAdmin = normalizeRole(role) === ADMIN_ROLE;

    // Sidebar is reserved for ADMIN. Everyone else — guest or non-admin user —
    // uses the horizontal navbar in GuestLayout.
    if (!isAuthenticated || !isAdmin) {
        return (
            <GuestLayout>
                <div className="flex-1 px-6 pb-6 pt-6">{children}</div>
            </GuestLayout>
        );
    }

    return (
        <SidebarProvider>
            <SidebarMenu />
            <SidebarInset className="h-screen flex flex-col overflow-hidden max-h-[calc(100vh-18px)]">
                <header className="flex h-16 shrink-0 items-center gap-2">
                    <div className="flex items-center gap-2 px-4 w-full justify-between">
                        <div className="flex items-center gap-2">
                            <DynamicBreadcrumbs pathTitles={pathName} />
                        </div>
                        <HeaderRight />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto min-h-0 flex flex-col px-6 pb-6 pt-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
