import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, Search, X } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { HeaderActionButton } from "@/components/layout/header/HeaderActionButton";
import { iconMap } from "@/components/datatable/iconMap";
import { cn } from "@/lib/utils";
import type { SidebarModuleGroup } from "@/hooks/useSidebarMenus";

import type { GuestNavItem } from "./GuestNavLinks";

interface GuestMobileMenuProps {
    publicItems?: GuestNavItem[];
    moduleGroups?: SidebarModuleGroup[];
    currentPath: string;
}

function resolveIcon(name?: string) {
    const key: keyof typeof iconMap =
        name && name in iconMap ? (name as keyof typeof iconMap) : "menu";
    return iconMap[key];
}

/**
 * Mobile / tablet navigation drawer. Shown on `< md` where the
 * horizontal `GuestNavLinks` is hidden.
 *
 * Features:
 *   - Sheet slide-in from the left (matches sidebar shell mental model)
 *   - Inline search to filter nav items by title (group name OR item title)
 *   - Collapsible module groups (expanded by default — short list)
 *   - `<SheetClose asChild>` wraps every navigation Link so picking a
 *     route auto-closes the drawer (otherwise the user has to tap the
 *     "X" first which feels stuck).
 */
export function GuestMobileMenu({
    publicItems = [],
    moduleGroups = [],
    currentPath,
}: GuestMobileMenuProps) {
    const [query, setQuery] = useState("");

    const filteredPublic = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return publicItems;
        return publicItems.filter((m) => m.title.toLowerCase().includes(q));
    }, [publicItems, query]);

    const filteredGroups = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return moduleGroups;
        return moduleGroups
            .map((g) => {
                if ((g.name ?? "").toLowerCase().includes(q)) return g;
                const modules = g.modules.filter((m) =>
                    (m.title ?? m.name ?? "").toLowerCase().includes(q),
                );
                if (modules.length === 0) return null;
                return { ...g, modules };
            })
            .filter((g): g is SidebarModuleGroup => g !== null);
    }, [moduleGroups, query]);

    const hasAny = filteredPublic.length > 0 || filteredGroups.length > 0;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <HeaderActionButton
                    tooltip="Mở menu"
                    icon={<Menu size={18} />}
                    className="md:hidden"
                />
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 flex flex-col">
                <SheetHeader className="border-b">
                    <SheetTitle className="text-base">Điều hướng</SheetTitle>
                </SheetHeader>

                {/* Search */}
                <div className="px-4 py-3 border-b">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <Input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tìm trong menu…"
                            className="h-9 pl-8 pr-8 text-sm"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                aria-label="Clear"
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Nav items */}
                <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                    {!hasAny && (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                            Không tìm thấy mục nào khớp với "{query}"
                        </div>
                    )}

                    {filteredPublic.map((m) => (
                        <MobileNavLink
                            key={`pub-${m.id}`}
                            to={m.url}
                            title={m.title}
                            icon={m.icon}
                            currentPath={currentPath}
                        />
                    ))}

                    {filteredGroups.map((group) => (
                        <MobileNavGroup
                            key={`group-${group.id ?? group.name}`}
                            group={group}
                            currentPath={currentPath}
                            forceOpen={query.trim().length > 0}
                        />
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ─── Single link inside the drawer ──────────────────────────────────────────
function MobileNavLink({
    to,
    title,
    icon,
    currentPath,
}: {
    to: string;
    title: string;
    icon?: string;
    currentPath: string;
}) {
    const Icon = resolveIcon(icon);
    const isActive = currentPath === to || currentPath.startsWith(`${to}/`);
    return (
        <SheetClose asChild>
            <Link
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                    "flex items-center gap-2.5 px-3 h-10 rounded-md text-sm font-medium transition-colors",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent",
                )}
            >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{title}</span>
            </Link>
        </SheetClose>
    );
}

// ─── Collapsible group inside the drawer ────────────────────────────────────
function MobileNavGroup({
    group,
    currentPath,
    forceOpen,
}: {
    group: SidebarModuleGroup;
    currentPath: string;
    forceOpen?: boolean;
}) {
    const groupActive = group.modules.some((m) => {
        const url = m.url as string | undefined;
        return !!url && (currentPath === url || currentPath.startsWith(`${url}/`));
    });

    // Default: open if any child is active or a search filter is forcing it.
    const defaultOpen = forceOpen || groupActive;

    return (
        <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
            <CollapsibleTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "w-full flex items-center gap-2.5 px-3 h-10 rounded-md text-sm font-medium transition-colors",
                        groupActive
                            ? "text-primary"
                            : "text-foreground hover:bg-accent",
                    )}
                >
                    <span className="flex-1 text-left truncate">{group.name}</span>
                    <ChevronDown
                        className="h-4 w-4 opacity-60 transition-transform group-data-[state=open]/collapsible:rotate-180"
                    />
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="pl-3 ml-3 border-l space-y-1 py-1">
                    {group.modules.map((m) => (
                        <MobileNavLink
                            key={m.id ?? m.url}
                            to={m.url as string}
                            title={m.title ?? m.name ?? ""}
                            icon={m.icon}
                            currentPath={currentPath}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
