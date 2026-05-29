import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iconMap } from "@/components/datatable/iconMap";
import { cn } from "@/lib/utils";
import type { SidebarModuleGroup } from "@/hooks/useSidebarMenus";

export interface GuestNavItem {
    id: string;
    url: string;
    title: string;
    icon?: string;
}

interface GuestNavLinksProps {
    /** Flat public-module links (shown to guests and admins browsing the site). */
    publicItems?: GuestNavItem[];
    /** Module groups for non-admin authenticated users (rendered as dropdowns). */
    moduleGroups?: SidebarModuleGroup[];
    /** Active path used to compute `aria-current` + visual state. */
    currentPath: string;
}

function resolveIcon(name?: string) {
    const key: keyof typeof iconMap =
        name && name in iconMap ? (name as keyof typeof iconMap) : "menu";
    return iconMap[key];
}

/**
 * Horizontal navigation for the guest header. Hidden on `< md` — the
 * mobile drawer takes over via `GuestMobileMenu`.
 *
 * Renders either:
 *   - flat public links (guest visitor, or admin browsing the public site)
 *   - module-group dropdowns (non-admin authenticated user)
 *
 * Active item highlights via a soft `bg-primary/10` + `text-primary`,
 * matched by an underline bar at the bottom of the row for the current
 * page (set via `aria-current="page"`).
 */
export function GuestNavLinks({
    publicItems,
    moduleGroups,
    currentPath,
}: GuestNavLinksProps) {
    return (
        <nav className="hidden md:flex items-center gap-1 ml-2">
            {publicItems?.map((m) => (
                <NavLinkItem
                    key={`public-${m.id}`}
                    url={m.url}
                    title={m.title}
                    icon={m.icon}
                    currentPath={currentPath}
                />
            ))}
            {moduleGroups?.map((group) => (
                <ModuleGroupDropdown
                    key={`group-${group.id ?? group.name}`}
                    group={group}
                    currentPath={currentPath}
                />
            ))}
        </nav>
    );
}

// ─── Single link ────────────────────────────────────────────────────────────
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
            aria-current={isActive ? "page" : undefined}
            className={cn(
                "relative flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors",
                isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/70",
            )}
        >
            <Icon className="h-4 w-4" />
            <span>{title}</span>
            {isActive && (
                <span className="absolute -bottom-[9px] left-3 right-3 h-0.5 bg-primary rounded-full" />
            )}
        </Link>
    );
}

// ─── Group dropdown ─────────────────────────────────────────────────────────
function ModuleGroupDropdown({
    group,
    currentPath,
}: {
    group: SidebarModuleGroup;
    currentPath: string;
}) {
    const GroupIcon = resolveIcon();
    const childUrls = group.modules
        .map((m) => m.url)
        .filter(Boolean) as string[];
    const isActive = childUrls.some(
        (u) => currentPath === u || currentPath.startsWith(`${u}/`),
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                        "relative flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/70",
                    )}
                >
                    <GroupIcon className="h-4 w-4" />
                    <span>{group.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70 data-[state=open]:rotate-180 transition-transform" />
                    {isActive && (
                        <span className="absolute -bottom-[9px] left-3 right-3 h-0.5 bg-primary rounded-full" />
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[14rem]">
                {group.modules.map((module) => {
                    const ModuleIcon = resolveIcon(module.icon);
                    const url = module.url as string;
                    const itemActive =
                        currentPath === url || currentPath.startsWith(`${url}/`);
                    return (
                        <DropdownMenuItem key={module.id ?? url} asChild>
                            <Link
                                to={url}
                                className={cn(
                                    "flex items-center gap-2",
                                    itemActive && "text-primary font-medium",
                                )}
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
