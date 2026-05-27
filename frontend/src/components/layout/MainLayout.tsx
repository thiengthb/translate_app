import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar";
import HeaderRight from "@/components/layout/HeaderRight";
import {SidebarMenu} from "@/components/layout/Sidebar.tsx";
import DynamicBreadcrumbs from "@/components/layout/DynamicBreadcrumbs.tsx";
import { UserTopNavbar } from "@/components/layout/UserTopNavbar.tsx";
import { usePermissions } from "@/hooks/usePermissions";
import { ADMIN_ROLE } from "@/utils/rbac.utils";

export function MainLayout({
                               children,
                               pathName,
                           }: {
    children: React.ReactNode;
    pathName?: Record<string, string>;
}) {
    const { activeRole } = usePermissions();
    const isAdmin = activeRole === ADMIN_ROLE;

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex flex-col">
                <UserTopNavbar />
                <main className="flex-1 flex flex-col px-6 pb-6 pt-6">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <SidebarMenu />
            <SidebarInset  className="h-screen flex flex-col overflow-hidden max-h-[calc(100vh-18px)]">
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