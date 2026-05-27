import { useActiveModuleGroups } from "@/hooks/useSidebarMenus";
import { iconMap } from "@/components/datatable/iconMap";
import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/api/features/auth.api";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import HeaderRight from "@/components/layout/HeaderRight";

export function UserTopNavbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { data: moduleGroups = [] } = useActiveModuleGroups();

    const navItems = useMemo(() => {
        const resolveIcon = (iconName?: string) => {
            const key: keyof typeof iconMap =
                iconName && iconName in iconMap ? (iconName as keyof typeof iconMap) : "menu";
            return iconMap[key];
        };

        return moduleGroups.flatMap((group) =>
            group.modules
                .filter((module) => !!module.url)
                .map((module) => ({
                    title: module.title ?? "Untitled",
                    url: module.url ?? "#",
                    icon: resolveIcon(module.icon),
                    isActive:
                        !!module.url &&
                        (location.pathname === module.url ||
                            location.pathname.startsWith(`${module.url}/`)),
                })),
        );
    }, [location.pathname, moduleGroups]);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
                {/* Logo */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
                        RB
                    </div>
                    <span className="text-lg font-bold text-primary hidden sm:block">RBAC System</span>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-border shrink-0" />

                {/* Nav Items */}
                <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.url}
                            to={item.url}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                item.isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                        >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.title}</span>
                        </Link>
                    ))}
                </nav>

                {/* Right side */}
                <div className="flex items-center gap-2 shrink-0">
                    <HeaderRight />
                    <TooltipWrapper content="Logout">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                                await authApi.logout();
                                navigate("/login");
                            }}
                        >
                            <LogOutIcon className="h-4 w-4" />
                        </Button>
                    </TooltipWrapper>
                </div>
            </div>
        </header>
    );
}
