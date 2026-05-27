import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, ChevronDown, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ToggleTheme from "@/components/ToggleTheme";
import UserMenu from "@/components/layout/UserMenu";
import NotificationCenter from "@/components/notification/NotificationCenter";
import { usePublicModules } from "@/hooks/usePublicModules";
import { useActiveModuleGroups, type SidebarModuleGroup } from "@/hooks/useSidebarMenus";
import { usePermissions } from "@/hooks/usePermissions";
import { iconMap } from "@/components/datatable/iconMap";
import {
    ADMIN_ROLE,
    formatRoleLabel,
    getHomePathByRole,
    normalizeRole,
} from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

function resolveIcon(name?: string) {
    const key: keyof typeof iconMap =
        name && name in iconMap ? (name as keyof typeof iconMap) : "menu";
    return iconMap[key];
}

const AUTH_PATHS = new Set([
    "/login",
    "/register",
    "/forgot-password",
    "/check-email",
    "/unauthorized",
    "/not-found-page",
]);

// Groups that should never appear in a non-admin user's navbar.
// STUDENT/TEACHER are granted MENU_READ so the FE can fetch menu metadata,
// but that same permission also passes the gate for the System/RBAC CRUD
// pages — so we filter those groups out explicitly here.
const ADMIN_ONLY_GROUP_NAMES = new Set([
    "system management",
    "rbac management",
    "dashboard",
]);

function isAdminOnlyGroup(name?: string | null): boolean {
    if (!name) return false;
    return ADMIN_ONLY_GROUP_NAMES.has(name.trim().toLowerCase());
}

type PublicNavItem = {
    id: string;
    url: string;
    title: string;
    icon?: string;
};

export function GuestLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);
    const { activeRole } = usePermissions();
    const isAdmin = normalizeRole(role) === ADMIN_ROLE;

    const { data: publicModules = [] } = usePublicModules();
    // Fetch the accessible module groups for non-admin authenticated users.
    // Admin already has the sidebar — no need to duplicate that menu here.
    const { data: moduleGroups = [] } = useActiveModuleGroups(isAuthenticated && !isAdmin);

    const isAuthPage = AUTH_PATHS.has(location.pathname);

    const publicNavItems: PublicNavItem[] = publicModules
        .filter((m) => !!m.url)
        .map((m) => ({
            id: String(m.id ?? m.url ?? ""),
            url: m.url as string,
            title: m.title ?? m.url ?? "",
            icon: m.icon,
        }));

    // Layout decisions:
    //   - non-admin authenticated user  → module group dropdowns
    //                                     (their accessible modules already
    //                                     include the public ones, so we
    //                                     skip the flat public list).
    //   - guest / admin browsing public → flat list of public modules.
    const showModuleGroups = isAuthenticated && !isAdmin && !isAuthPage;
    const showPublicFlat = !showModuleGroups && !isAuthPage;

    const visibleModuleGroups = showModuleGroups
        ? moduleGroups.filter((g) => !isAdminOnlyGroup(g.name))
        : [];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl">
                <div className="w-full flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
                    <Link
                        to={isAuthenticated ? getHomePathByRole(activeRole) : "/"}
                        className="flex items-center gap-2.5 shrink-0"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                            R
                        </div>
                        <span className="text-base font-semibold text-foreground hidden sm:inline-block">
                            RBAC System
                        </span>
                    </Link>

                    {!isAuthPage && (
                        <nav className="hidden md:flex items-center gap-1 ml-2">
                            {showPublicFlat &&
                                publicNavItems.map((m) => (
                                    <NavLinkItem
                                        key={`public-${m.id}`}
                                        url={m.url}
                                        title={m.title}
                                        icon={m.icon}
                                        currentPath={location.pathname}
                                    />
                                ))}

                            {visibleModuleGroups.map((group) => (
                                <ModuleGroupDropdown
                                    key={`group-${group.id ?? group.name}`}
                                    group={group}
                                    currentPath={location.pathname}
                                />
                            ))}
                        </nav>
                    )}

                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                        <ToggleTheme />

                        {isAuthenticated ? (
                            <>
                                {activeRole && (
                                    <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                                        {formatRoleLabel(activeRole)}
                                    </Badge>
                                )}
                                <NotificationCenter />
                                <UserMenu />
                            </>
                        ) : (
                            !isAuthPage && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate("/login")}
                                        className="gap-1.5"
                                    >
                                        <LogIn size={15} />
                                        <span className="hidden sm:inline">Đăng nhập</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => navigate("/register")}
                                        className="gap-1.5"
                                    >
                                        <span>Đăng ký</span>
                                        <ArrowRight size={15} />
                                    </Button>
                                </>
                            )
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col">{children}</main>

            <footer className="border-t bg-muted/30 py-6">
                <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>© {new Date().getFullYear()} RBAC System</span>
                    <span className="text-xs">Powered by Spring Boot + React</span>
                </div>
            </footer>
        </div>
    );
}

function NavLinkItem({
    url,
    title,
    icon,
    currentPath,
}: {
    url: string;
    title: string;
    icon?: string;
    currentPath: string;
}) {
    const Icon = resolveIcon(icon);
    const isActive = currentPath === url || currentPath.startsWith(`${url}/`);
    return (
        <Link
            to={url}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
            }`}
        >
            <Icon className="h-4 w-4" />
            <span>{title}</span>
        </Link>
    );
}

function ModuleGroupDropdown({
    group,
    currentPath,
}: {
    group: SidebarModuleGroup;
    currentPath: string;
}) {
    const GroupIcon = resolveIcon();
    const childUrls = group.modules.map((m) => m.url).filter(Boolean) as string[];
    const isActive = childUrls.some(
        (u) => currentPath === u || currentPath.startsWith(`${u}/`),
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
                    }`}
                >
                    <GroupIcon className="h-4 w-4" />
                    <span>{group.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[14rem]">
                {group.modules.map((module) => {
                    const ModuleIcon = resolveIcon(module.icon);
                    const url = module.url as string;
                    const itemActive = currentPath === url || currentPath.startsWith(`${url}/`);
                    return (
                        <DropdownMenuItem key={module.id ?? url} asChild>
                            <Link
                                to={url}
                                className={`flex items-center gap-2 ${
                                    itemActive ? "text-primary font-medium" : ""
                                }`}
                            >
                                <ModuleIcon className="h-4 w-4 opacity-80" />
                                <span>{module.title ?? module.name}</span>
                            </Link>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
