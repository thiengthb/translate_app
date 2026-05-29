import { useEffect, useRef, useState } from "react";
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
 * Horizontal navigation for the guest header.
 *
 * Top-level entries are **text-only** — icons live inside the
 * dropdowns where they help scanning. The bar itself stays clean so the
 * Logo + nav + actions cluster reads at a glance.
 *
 * Group dropdowns open on **hover** with a small close delay so the
 * mouse can travel from trigger to content without snapping shut.
 * Click + keyboard still work (Radix's default open behaviour is
 * preserved on top of our `onMouseEnter`/`onMouseLeave` handlers).
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

// ─── Single link (top-level) ────────────────────────────────────────────────
function NavLinkItem({
    url,
    title,
    currentPath,
}: {
    url: string;
    title: string;
    currentPath: string;
}) {
    const isActive = currentPath === url || currentPath.startsWith(`${url}/`);
    return (
        <Link
            to={url}
            aria-current={isActive ? "page" : undefined}
            className={cn(
                "relative flex items-center h-9 px-3 rounded-md text-sm font-medium transition-colors",
                isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/70",
            )}
        >
            <span>{title}</span>
            {isActive && (
                <span className="absolute -bottom-[9px] left-3 right-3 h-0.5 bg-primary rounded-full" />
            )}
        </Link>
    );
}

// ─── Group dropdown (hover-triggered) ───────────────────────────────────────
const HOVER_CLOSE_DELAY_MS = 120;

function ModuleGroupDropdown({
    group,
    currentPath,
}: {
    group: SidebarModuleGroup;
    currentPath: string;
}) {
    const [open, setOpen] = useState(false);
    const closeTimerRef = useRef<number | null>(null);

    const childUrls = group.modules
        .map((m) => m.url)
        .filter(Boolean) as string[];
    const isActive = childUrls.some(
        (u) => currentPath === u || currentPath.startsWith(`${u}/`),
    );

    const openMenu = () => {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setOpen(true);
    };

    // Schedule close on mouse leave — small delay lets the user travel from
    // the trigger to the dropdown content without the menu snapping shut
    // mid-trajectory. Cancelled by the next `openMenu()` if the cursor
    // arrives at the content.
    const scheduleClose = () => {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = window.setTimeout(() => {
            setOpen(false);
            closeTimerRef.current = null;
        }, HOVER_CLOSE_DELAY_MS);
    };

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                window.clearTimeout(closeTimerRef.current);
            }
        };
    }, []);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    onMouseEnter={openMenu}
                    onMouseLeave={scheduleClose}
                    className={cn(
                        "relative flex items-center gap-1 h-9 px-3 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/70",
                    )}
                >
                    <span>{group.name}</span>
                    <ChevronDown
                        className={cn(
                            "h-3.5 w-3.5 opacity-70 transition-transform",
                            open && "rotate-180",
                        )}
                    />
                    {isActive && (
                        <span className="absolute -bottom-[9px] left-3 right-3 h-0.5 bg-primary rounded-full" />
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="min-w-[14rem]"
                onMouseEnter={openMenu}
                onMouseLeave={scheduleClose}
            >
                {group.modules.map((module) => {
                    const ModuleIcon = resolveIcon(module.icon);
                    const url = module.url as string;
                    const itemActive =
                        currentPath === url ||
                        currentPath.startsWith(`${url}/`);
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
